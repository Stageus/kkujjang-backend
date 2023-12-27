import { configDotenv } from 'dotenv'
import { redisClient } from '@database/redis'
import { pgQuery } from '@database/postgres'
import express from 'express'
import asyncify from 'express-asyncify'
import * as kakao from '@utility/kakao'
import { getSession, createSession, destorySession } from '@utility/session'
import * as uuid from 'uuid'
import * as validation from '@utility/validation'
import { isSignedIn } from '@utility/session'

configDotenv()

export const userRouter = asyncify(express.Router())

// 카카오 로그인 콜백
// 토큰 발급 -> 사용자 정보 조회 -> 첫 가입 시 DB 등록 -> 세션 등록 -> 쿠키에 세션 ID 저장
userRouter.get('/oauth/kakao', async (req, res) => {
  if (req.cookies.sessionId) {
    throw {
      statusCode: 400,
      message: '이미 로그인된 상태입니다.',
    }
  }

  // 토큰 발급
  const tokenData = await kakao.getToken(req.query.code)

  tokenData.access_token ??
    (() => {
      throw {
        statusCode: 401,
        message: '유효하지 않은 인증 코드입니다.',
      }
    })()

  console.log(`Access Token: ${tokenData.access_token}`)

  // 사용자 ID 조회
  const kakaoUserData = await kakao.getUserData(tokenData.access_token)

  kakaoUserData.id ??
    (() => {
      throw {
        statusCode: 401,
        message: '유효하지 않은 토큰입니다.',
      }
    })()

  const kakaoId = kakaoUserData.id
  console.log(`Kakao User ID: ${kakaoId}`)

  // 첫 로그인 여부 판단
  const firstSigninValidation = await pgQuery(
    `SELECT count(*) AS count FROM kkujjang.user_auth_kakao WHERE kakao_id=$1 AND is_deleted=FALSE;`,
    [kakaoId],
  )

  // 첫 로그인 시 DB에 정보 저장
  if (firstSigninValidation.rows[0].count == 0) {
    console.log('First Login...')

    const dbIndex = Number(
      (
        await pgQuery(
          `INSERT INTO kkujjang.user (nickname) VALUES (NULL) RETURNING id;`,
        )
      ).rows[0].id,
    )
    console.log(`DB INDEX: ${dbIndex}`)

    await pgQuery(
      `INSERT INTO kkujjang.user_auth_kakao (kakao_id, user_id) VALUES ($1, $2);`,
      [kakaoId, dbIndex],
    )
  }

  const { id: userId, authority_level: authorityLevel } = (
    await pgQuery(
      `SELECT kkujjang.user.id, authority_level FROM kkujjang.user
    JOIN kkujjang.user_auth_kakao
    ON kkujjang.user.id = kkujjang.user_auth_kakao.user_id
    WHERE kakao_id = $1;`,
      [kakaoId],
    )
  ).rows[0]

  console.log(`User ID: ${userId}, Authority Level: ${authorityLevel}`)

  const sessionId = await createSession({
    userId,
    kakaoToken: tokenData.access_token,
    authorityLevel,
  })

  console.log('session successfully stored')

  console.log(JSON.stringify(await getSession(sessionId)))

  res.setHeader(
    'Set-Cookie',
    `sessionId=${sessionId}; HttpOnly; Secure; Max-Age=7200`,
  )

  res.json({
    result: 'success',
  })
})

userRouter.get('/oauth/unlink', async (req, res) => {
  const sessionId = req.cookies.sessionId

  if (!sessionId) {
    throw {
      statusCode: 401,
      message: '로그인하지 않은 상태입니다.',
    }
  }

  const { userId, kakaoToken } = await getSession(sessionId)

  console.log(`User ID: ${userId}, token: ${kakaoToken}`)

  // 카카오 계정 연결 해제
  await kakao.unlink(token)

  // 세션 삭제
  await destorySession(sessionId)

  await pgQuery(
    `UPDATE kkujjang.user_auth_kakao SET is_deleted = TRUE WHERE user_id=$1`,
    [userId],
  )

  await pgQuery(`UPDATE kkujjang.user SET is_deleted = TRUE WHERE id=$1`, [
    userId,
  ])

  // 세션 쿠키 삭제
  res
    .setHeader('Set-Cookie', `sessionId=none; HttpOnly; Secure; Max-Age=0`)
    .json({
      result: 'success',
    })
})

// 로그아웃
userRouter.get('/signout', async (req, res) => {
  // Permission : 사용자, 관리자
  const sessionId = req.cookies.sessionId
  if (!sessionId) {
    throw {
      statusCode: 401,
      message: '로그인하지 않은 상태입니다.',
    }
  }

  await destorySession(`session-${sessionId}`)

  res.setHeader(
    'Set-Cookie',
    `sessionId=none;  Path=/; HttpOnly; Secure; Max-Age=0`,
  )

  res.json({
    result: 'success',
  })
})

// 로그인
userRouter.post('/signin', async (req, res) => {
  // Permission : 게스트
  if (req.cookies.sessionId) {
    throw {
      statusCode: 400,
      message: '이미 로그인된 상태입니다.',
    }
  }

  const { username, password } = req.body
  const queryString = `SELECT id, authority_level FROM kkujjang.user
  WHERE username = $1 AND password = crypt($2, password)`
  const values = [username, password]
  const queryRes = await pgQuery(queryString, values)

  if (queryRes.rowCount == 0) {
    throw {
      statusCode: 401,
      message: '존재하지 않는 계정 정보입니다.',
    }
  }

  if (2 <= queryRes.rowCount) {
    throw {
      statusCode: 500,
      message: '여러개의 동일한 계정이 user_auth 테이블에 존재합니다.',
    }
  }

  const { id: userId, authority_level: authorityLevel } = queryRes.rows[0]

  if (await isSignedIn(userId)) {
    throw {
      statusCode: 400,
      message: '접속중인 계정입니다.',
    }
  }

  const sessionId = await createSession({
    userId,
    kakaoToken: '',
    authorityLevel,
  })

  res.setHeader(
    'Set-Cookie',
    `sessionId=${sessionId}; Path=/; HttpOnly; Secure; Max-Age=7200`,
  )

  res.json({
    result: 'suecess',
  })
})

// 특정 조건에 맞는 사용자 검색
userRouter.get('/search', async (req, res) => {
  // Permission : 관리자
  const sessionId = req.cookies.sessionId
  if (!sessionId) {
    throw {
      statusCode: 401,
      message: '로그인 해주세요',
    }
  }
  const authorityLevel = (await getSession(sessionId)).authorityLevel
  if (authorityLevel != 1) {
    throw {
      statusCode: 401,
      message: '관리자 권한이 없습니다.',
    }
  }
  const username = req.query.username
  const nickname = req.query.nickname
  const isBanned = req.query.isBanned

  const conditions = []
  const values = []
  let conditionCnt = 1
  if (username) {
    conditions.push(`username = $${conditionCnt++}`)
    values.push(username)
  }
  if (nickname) {
    conditions.push(`nickname = $${conditionCnt++}`)
    values.push(nickname)
  }
  if (isBanned) {
    conditions.push(`is_banned = $${conditionCnt++}`)
    values.push(isBanned)
  }

  let queryString = `SELECT id, username, nickname, is_banned FROM kkujjang.user WHERE is_deleted = FALSE`

  if (conditions.length) {
    queryString += ' AND ' + conditions.join(' AND ')
  }

  const queryRes = await pgQuery(queryString, values)
  const result = []
  for (const data of queryRes.rows) {
    console.log(data)
    const { id, username, nickname, is_banned } = data
    const temp = { id, username, nickname, isBanned: is_banned }
    result.push(temp)
  }
  res.json({
    result,
  })
})

// 비밀번호 찾기
userRouter.post('/find/pw', async (req, res) => {})

// 아이디 찾기
userRouter.post('/find/pw', async (req, res) => {})

// 문자 인증정보 생성(임시)
userRouter.get('/tempAuth-code', async (req, res) => {
  // Permission : 누구나
  const { phone } = req.body
  const authId = uuid.v4()

  let queryString = `SELECT count(*) FROM  kkujjang.user WHERE phone = $1`
  let values = [phone]
  let queryRes = await pgQuery(queryString, values)

  if (0 < queryRes.rows[0].count) {
    throw {
      statusCode: 400,
      message: '중복된 휴대폰 번호가 존재합니다.',
    }
  }

  await redisClient.hSet(`auth-${authId}`, {
    authNumber: phone,
    fulfilled: 'true',
  })

  await redisClient.expire(`auth-${authId}`, 3600)

  res.setHeader(
    'Set-Cookie',
    `smsAuthId=${authId}; HttpOnly; Path=/; Secure; Max-Age=3600`,
  )

  res.json({
    result: 'success',
  })
})

// 인덱스를 이용한 사용자 검색
userRouter.get('/:id', async (req, res) => {
  // Permission : 사용자, 관리자
  const sessionId = req.cookies.sessionId
  if (!sessionId) {
    throw {
      statusCode: 401,
      message: '로그인하지 않은 상태입니다.',
    }
  }

  const id = req.params.id
  const queryString = `SELECT level, nickname, wins, loses, is_banned, banned_reason FROM kkujjang.user WHERE id = $1 AND is_deleted = FALSE`
  const values = [id]
  const queryRes = await pgQuery(queryString, values)

  if (queryRes.rowCount == 0) {
    throw {
      statusCode: 400,
      message: '존재하지 않는 id입니다.',
    }
  }
  if (2 <= queryRes.rowCount) {
    throw {
      statusCode: 500,
      message: '동일한 id가 2개 이상 존재합니다.',
    }
  }

  const { level, nickname, wins, loses, is_banned, banned_reason } =
    queryRes.rows[0]

  let winRate
  if (wins == 0 && loses == 0) {
    winRate = 0.0
  } else if (loses == 0) {
    winRate = 100.0
  } else {
    winRate = (wins / (wins + loses)) * 100
    winRate = winRate.toFixed(1)
    winRate = Number(winRate)
  }
  let result = {
    level,
    nickname,
    winRate,
  }

  const authorityLevel = (await getSession(sessionId)).authorityLevel
  if (authorityLevel == 1) {
    result.isBanned = is_banned
    result.bannedReason = banned_reason
  }
  res.send(result)
})

// 회원 탈퇴
userRouter.delete('/', async (req, res) => {
  // Permission : 사용자, 관리자
  const sessionId = req.cookies.sessionId
  if (!sessionId) {
    throw {
      statusCode: 401,
      message: '로그인하지 않은 상태입니다.',
    }
  }

  const id = (await getSession(sessionId)).userId
  const queryString = `UPDATE kkujjang.user SET kakao_id = null, username = NULL, phone = NULL, is_deleted = TRUE WHERE id = $1`
  const values = [id]
  await pgQuery(queryString, values)

  res.setHeader(
    'Set-Cookie',
    `sessionId=none; Path=/; HttpOnly; Secure; Max-Age=0`,
  )
  await destorySession(sessionId)

  res.json({
    result: 'success',
  })
})

// 회원 정보 수정
userRouter.put('/', async (req, res) => {
  // Permission : 사용자, 관리자
  const sessionId = req.cookies.sessionId
  if (!sessionId) {
    throw {
      statusCode: 401,
      message: '로그인하지 않은 상태입니다.',
    }
  }

  const { nickname } = req.body
  const id = (await getSession(sessionId)).userId
  const queryString = `UPDATE kkujjang.user SET nickname = $1 WHERE id = $2`
  const values = [nickname, id]
  await pgQuery(queryString, values)

  res.json({
    result: 'success',
  })
})

// 회원가입
userRouter.post('/', async (req, res) => {
  // Permission : 게스트
  if (req.cookies.sessionId) {
    throw {
      statusCode: 400,
      message: '이미 로그인된 상태입니다.',
    }
  }

  const smsAuthId = req.cookies.smsAuthId
  const { username, password, phone } = req.body

  // 휴대폰 인증 여부 처리(1) 검증
  const smsAuth = await redisClient.hGetAll(`auth-${smsAuthId}`)

  if (smsAuth.authNumber != phone || smsAuth.fulfilled != 'true') {
    throw {
      statusCode: 400,
      message: '휴대폰 인증이 되어있지 않습니다.',
    }
  }
  // 휴대폰 인증 여부 처리(1) 검증 끝

  // 휴대폰 인증 여부 처리(2) 해당 휴대폰 인증 정보 삭제
  await redisClient.del(`auth-${smsAuthId}`)

  res.setHeader(
    'Set-Cookie',
    `sessionId=none; Path=/; HttpOnly; Secure; Max-Age=0`,
  )
  // 휴대폰 인증 여부 처리(2) 해당 휴대폰 인증 정보 삭제 끝

  validation.check(
    username,
    'username',
    validation.checkExist(),
    validation.checkLength(7, 30),
    validation.checkRegExp(/^(?=.*[a-z])(?=.*[0-9])[a-z0-9]+$/),
  )
  validation.check(
    password,
    'password',
    validation.checkExist(),
    validation.checkLength(7, 30),
    validation.checkRegExp(
      /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[@#$%^&+=!\(\)])[a-zA-Z0-9@#$%^&+=!\(\)]+$/,
    ),
  )
  validation.check(
    phone,
    'phone',
    validation.checkExist(),
    validation.checkRegExp(/^010-\d{4}-\d{4}$/),
  )

  let queryString = `SELECT count(*) FROM  kkujjang.user WHERE username = $1 OR phone = $2`
  let values = [username, phone]
  let queryRes = await pgQuery(queryString, values)

  if (0 < queryRes.rows[0].count) {
    throw {
      statusCode: 400,
      message: '중복된 계정 정보가 존재합니다.',
    }
  }

  queryString = `INSERT INTO kkujjang.user (username, password, phone) VALUES ($1, crypt($2, gen_salt('bf')), $3)`
  values = [username, password, phone]
  await pgQuery(queryString, values)

  res.json({
    result: 'success',
  })
})
