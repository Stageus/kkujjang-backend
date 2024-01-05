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
import { sendSMS } from '@utility/sms-auth'
import {
  allowGuestOnly,
  requireAdminAuthority,
  requireSignin,
  requireSmsAuth,
} from '@middleware/auth'
import {
  validateSignUp,
  validateAuthCodeCheck,
  validateReceiverNumber,
  validateSignIn,
  validateUserModification,
  validatePasswordReset,
} from '@middleware/user'

configDotenv()

export const userRouter = asyncify(express.Router())

// 카카오 로그인 콜백
// 토큰 발급 -> 사용자 정보 조회 -> 첫 가입 시 DB 등록 -> 세션 등록 -> 쿠키에 세션 ID 저장
userRouter.get('/oauth/kakao', allowGuestOnly, async (req, res) => {
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
    `SELECT count(*) AS count FROM kkujjang.user WHERE kakao_id=$1 AND is_deleted=FALSE;`,
    [kakaoId],
  )

  // 첫 로그인 시 DB에 정보 저장
  if (firstSigninValidation.rows[0].count == 0) {
    console.log('First Login...')

    await pgQuery(`INSERT INTO kkujjang.user (kakao_id) VALUES ($1);`, [
      kakaoId,
    ])
  }

  const { id: userId, authority_level: authorityLevel } = (
    await pgQuery(
      `SELECT id, authority_level FROM kkujjang.user WHERE kakao_id = $1;`,
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
    `sessionId=${sessionId}; HttpOnly; Path=/; Secure; Max-Age=7200`,
  )

  res.json({
    result: 'success',
  })
})

userRouter.get('/oauth/unlink', requireSignin, async (req, res) => {
  const sessionId = req.cookies.sessionId
  const { userId, kakaoToken } = res.locals.session

  console.log(`User ID: ${userId}, token: ${kakaoToken}`)

  // 카카오 계정 연결 해제
  await kakao.unlink(kakaoToken)

  // 세션 삭제
  await destorySession(sessionId)

  await pgQuery(`UPDATE kkujjang.user SET is_deleted = TRUE WHERE id=$1`, [
    userId,
  ])

  // 세션 쿠키 삭제
  res
    .setHeader(
      'Set-Cookie',
      `sessionId=none; HttpOnly; Path=/; Secure; Max-Age=0`,
    )
    .json({
      result: 'success',
    })
})

userRouter.get('/auth-code', validateReceiverNumber, async (req, res) => {
  const { receiverNumber } = req.query

  const smsAuthId = uuid.v4()
  const authNumber = String(Math.floor(Math.random() * 900000) + 100000)

  console.log(`smsAuthId: ${smsAuthId}, authNumber: ${authNumber}`)

  await redisClient.hSet(`auth-${smsAuthId}`, {
    authNumber: authNumber,
    fulfilled: 'false',
    phoneNumber: receiverNumber,
  })
  await redisClient.expire(`auth-${smsAuthId}`, 300)

  const snsResult = await sendSMS(
    receiverNumber,
    `끝짱 인증번호: ${authNumber}`,
  )
  console.log(snsResult)

  res
    .setHeader(
      'Set-Cookie',
      `smsAuthId=${smsAuthId}; HttpOnly; Path=/; Secure; Max-Age=300`,
    )
    .json({
      result: 'success',
    })
})

userRouter.post('/auth-code/check', validateAuthCodeCheck, async (req, res) => {
  const { smsAuthId } = req.cookies
  const { authNumber, phoneNumber } = req.body

  const { authNumber: answer, phoneNumber: targetPhoneNumber } =
    await redisClient.hGetAll(`auth-${smsAuthId}`)
  const result = {
    result: 'success',
  }

  if (phoneNumber === targetPhoneNumber && authNumber === answer) {
    redisClient.hSet(`auth-${smsAuthId}`, {
      fulfilled: 'true',
    })
    redisClient.expire(`auth-${smsAuthId}`, 1800)
  } else {
    throw {
      statusCode: 400,
      message: '잘못된 인증 정보입니다.',
    }
  }

  res.json(result)
})

// 로그아웃
userRouter.get('/signout', requireSignin, async (req, res) => {
  const sessionId = req.cookies.sessionId

  // 세션과 쿠키 삭제
  await destorySession(sessionId)
  res.setHeader(
    'Set-Cookie',
    `sessionId=none; Path=/; Secure; HttpOnly; Max-Age=0`,
  )

  res.json({
    result: 'success',
  })
})

// 로그인
userRouter.post('/signin', allowGuestOnly, validateSignIn, async (req, res) => {
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

  const { id: userId, authority_level: authorityLevel } = queryRes.rows[0]

  if (await isSignedIn(userId.toString())) {
    throw {
      statusCode: 400,
      message: '접속중인 계정입니다.',
    }
  }

  const sessionId = await createSession({
    userId,
    authorityLevel,
  })

  res.setHeader(
    'Set-Cookie',
    `sessionId=${sessionId}; Path=/; Secure; HttpOnly; Max-Age=7200`,
  )

  res.json({
    result: 'suecess',
  })
})

// 특정 조건에 맞는 사용자 검색
userRouter.get('/search', requireAdminAuthority, async (req, res) => {
  const username = req.query.username
  const nickname = req.query.nickname
  const isBanned = req.query.isBanned

  // 쿼리 파라미터 검증
  validation.check(username, `username`, validation.checkRegExp(/^[a-z0-9]+$/))
  validation.check(
    nickname,
    `nickname`,
    validation.checkRegExp(/^[a-zA-Z0-9가-힣]+$/),
  )
  // 쿼리 파라미터 검증 끝

  const conditions = []
  const values = []
  let conditionCnt = 1
  if (username) {
    conditions.push(`username LIKE $${conditionCnt++}`)
    values.push(`%${username}%`)
  }
  if (nickname) {
    conditions.push(`nickname LIKE $${conditionCnt++}`)
    values.push(`%${nickname}%`)
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
    const { id, username, nickname, is_banned } = data
    const temp = { id, username, nickname, isBanned: is_banned }
    result.push(temp)
  }

  res.json({
    result,
  })
})

// 비밀번호 재설정
userRouter.post(
  '/find/pw',
  allowGuestOnly,
  requireSmsAuth,
  validatePasswordReset,
  async (req, res) => {
    const { username, newPassword, phone } = req.body

    let queryString = `SELECT count(*) AS count FROM kkujjang.user WHERE username = $1 AND phone = $2`
    let values = [username, phone]
    const { count } = (await pgQuery(queryString, values)).rows[0]
    if (count === 0) {
      throw {
        statusCode: 400,
        message: '해당하는 계정 정보가 존재하지 않습니다.',
      }
    }

    queryString = `UPDATE kkujjang.user SET password = crypt($1, gen_salt('bf')) WHERE username = $2 AND phone = $3`
    values = [newPassword, username, phone]
    await pgQuery(queryString, values)

    res.json({
      result: 'success',
    })
  },
)

// 아이디 찾기
userRouter.post(
  '/find/id',
  allowGuestOnly,
  requireSmsAuth,
  async (req, res) => {
    const { phone } = req.body

    const queryString = `SELECT username FROM kkujjang.user WHERE phone = $1`
    const values = [phone]
    const queryRes = await pgQuery(queryString, values)

    if (queryRes.rowCount == 0) {
      throw {
        statusCode: 400,
        message: '해당하는 계정 정보가 존재하지 않습니다.',
      }
    }

    const { username } = queryRes.rows[0]

    res.json({
      result: username,
    })
  },
)

// 인덱스를 이용한 사용자 검색
userRouter.get('/:userId', requireSignin, async (req, res) => {
  const { userId } = req.params
  const { authorityLevel } = res.locals.session

  const queryString = `SELECT level, exp, nickname, wins, loses, is_banned, banned_reason FROM kkujjang.user WHERE id = $1 AND is_deleted = FALSE`
  const values = [userId]
  const queryRes = await pgQuery(queryString, values)

  if (queryRes.rowCount == 0) {
    throw {
      statusCode: 400,
      message: '존재하지 않는 사용자입니다.',
    }
  }

  const { level, exp, nickname, wins, loses, is_banned, banned_reason } =
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
    exp,
    nickname,
    winRate,
  }

  if (authorityLevel === process.env.ADMIN_AUTHORITY) {
    result.isBanned = is_banned
    result.bannedReason = banned_reason
  }

  res.json({ result })
})

// 회원 탈퇴
userRouter.delete('/', requireSignin, async (req, res) => {
  const { sessionId } = req.cookies
  const { userId } = res.locals.session

  const queryString = `UPDATE kkujjang.user SET kakao_id = NULL, username = NULL, phone = NULL, nickname = NULL, is_deleted = TRUE WHERE id = $1`
  const values = [userId]
  await pgQuery(queryString, values)

  await destorySession(sessionId)

  res
    .setHeader(
      'Set-Cookie',
      `sessionId=none; Path=/; HttpOnly; Secure; Max-Age=0`,
    )
    .json({
      result: 'success',
    })
})

// 회원 정보 수정
userRouter.put(
  '/',
  requireSignin,
  validateUserModification,
  async (req, res) => {
    const { nickname } = req.body
    const { id } = res.locals.session

    const queryString = `UPDATE kkujjang.user SET nickname = $1 WHERE id = $2`
    const values = [`${nickname}#${id}`, id]
    await pgQuery(queryString, values)

    res.json({
      result: 'success',
    })
  },
)

// 회원가입
userRouter.post(
  '/',
  allowGuestOnly,
  requireSmsAuth,
  validateSignUp,
  async (req, res) => {
    const { username, password, phone } = req.body

    const queryString = `INSERT INTO kkujjang.user (username, password, phone) VALUES ($1, crypt($2, gen_salt('bf')), $3)`
    const values = [username, password, phone]
    await pgQuery(queryString, values)

    res.json({
      result: 'success',
    })
  },
)
