import { configDotenv } from 'dotenv'
import { redisClient } from '@database/redis'
import { pgQuery } from '@database/postgres'
import express from 'express'
import asyncify from 'express-asyncify'
import * as kakao from '@utility/kakao'
import { getSession, createSession, destorySession } from '@utility/session'
import * as uuid from 'uuid'
import * as validation from '@utility/validation'

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
          `INSERT INTO kkujjang.user_profile (nickname) VALUES (NULL) RETURNING id;`,
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
      `SELECT kkujjang.user_profile.id, authority_level FROM kkujjang.user_profile
    JOIN kkujjang.user_auth_kakao
    ON kkujjang.user_profile.id = kkujjang.user_auth_kakao.user_id
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

  await pgQuery(
    `UPDATE kkujjang.user_profile SET is_deleted = TRUE WHERE id=$1`,
    [userId],
  )

  // 세션 쿠키 삭제
  res
    .setHeader('Set-Cookie', `sessionId=none; HttpOnly; Secure; Max-Age=0`)
    .json({
      result: 'success',
    })
})

// 로그아웃
userRouter.get('/signout', async (req, res) => {
  const sessionId = req.cookies.sessionId

  if (!sessionId) {
    throw {
      statusCode: 401,
      message: '로그인하지 않은 상태입니다.',
    }
  }

  await destorySession(`session-${sessionId}`)

  res.setHeader('Set-Cookie', `sessionId=none; HttpOnly; Secure; Max-Age=0`)

  res.json({
    result: 'success',
  })
})

// 로그인
userRouter.post('/signin', async (req, res) => {
  if (req.cookies.sessionId) {
    throw {
      statusCode: 400,
      message: '이미 로그인된 상태입니다.',
    }
  }

  const { username, password } = req.body
  const queryString = `SELECT kkujjang.user_profile.id, authority_level FROM kkujjang.user_profile
  JOIN kkujjang.user_auth
  ON kkujjang.user_profile.id = kkujjang.user_auth.user_id
  WHERE username = $1 AND password = $2;`
  const values = [username, password]
  const queryRes = await pgQuery(queryString, values)

  if (queryRes.rowCount == 0) {
    res.send({
      result: 'fail',
      message: '존재하지 않는 계정 정보입니다.',
    })
  }

  if (2 <= queryRes.rowCount) {
    throw {
      statusCode: 500,
      message: '여러개의 동일한 계정이 user_auth 테이블에 존재합니다',
    }
  }

  const { id: userId, authority_level: authorityLevel } = queryRes.rows[0]

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

// 유저 검색
userRouter.get('/search', async (req, res) => {})

// 문자 인증정보 생성(임시)
userRouter.get('/tempAuth-code', async (req, res) => {
  const authId = uuid.v4()

  const phone = '010-1111-1111'
  await redisClient.hSet(`auth-${authId}`, {
    authNumber: phone,
    fulfilled: 'true',
  })

  await redisClient.expire(`auth-${authId}`, 3600)

  res.setHeader(
    'Set-Cookie',
    `smsAuthId=${authId}; Path=/; HttpOnly; Secure; Max-Age=3600`,
  )

  res.json({
    result: 'success',
  })
})

// 회원가입
userRouter.post('/', async (req, res) => {
  const smsAuthId = req.cookies.smsAuthId
  const { username, password, phone } = req.body

  const smsAuth = await redisClient.hGetAll(`auth-${smsAuthId}`)

  if (smsAuth.phone != phone && smsAuth.fulfilled != 'true') {
    throw {
      statusCode: 400,
      message: '휴대폰 인증이 되어있지 않습니다.',
    }
  }

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

  let queryString = `SELECT count(*) FROM  kkujjang.user_auth WHERE username = $1 AND phone = $2`
  let values = [username, phone]
  let queryRes = await pgQuery(queryString, values)
  if (0 < queryRes.rows[0].count) {
    throw {
      statusCode: 400,
      message: '중복된 계정 정보가 존재합니다.',
    }
  }

  queryString = `INSERT INTO kkujjang.user_profile (nickname) VALUES (null) RETURNING id`
  values = []
  const dbIndex = Number((await pgQuery(queryString)).rows[0].id)

  queryString = `INSERT INTO kkujjang.user_auth (username, password, user_id, phone) VALUES ($1, $2, $3, $4)`
  values = [username, password, dbIndex, phone]
  await pgQuery(queryString, values)

  res.json({
    result: 'success',
  })
})

// 회원정보 조회
userRouter.get('/:id', async (req, res) => {})

// 회원 탈퇴
userRouter.delete('/:id', async (req, res) => {})

// 회원 정보 수정
userRouter.post('/:id', async (req, res) => {})
