import { configDotenv } from 'dotenv'
import { redisClient } from '@database/redis'
import { pgQuery } from '@database/postgres'
import express from 'express'
import asyncify from 'express-asyncify'
import * as kakao from '@utility/kakao'
import { getSession, createSession, destorySession } from '@utility/session'
import * as uuid from 'uuid'
import { sendSMS } from '@utility/sms-auth'
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

userRouter.get('/oauth/unlink', async (req, res) => {
  const sessionId = req.cookies.sessionId

  if (!sessionId) {
    throw {
      statusCode: 401,
      message: '로그인하지 않은 상태입니다.',
    }
  }

  const { userId = null, kakaoToken = null } = await getSession(sessionId)

  console.log(`User ID: ${userId}, token: ${kakaoToken}`)

  if (userId === null) {
    throw {
      statusCode: 401,
      message: '유효하지 않은 세션 정보입니다.',
    }
  }

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

userRouter.get('/auth-code', async (req, res) => {
  const { receiverNumber } = req.query

  validation.check(
    receiverNumber,
    'receiverNumber',
    validation.checkExist(),
    validation.checkRegExp(/010-\d{4}-\d{4}/),
  )

  const smsAuthId = uuid.v4()
  const authNumber = String(Math.floor(Math.random() * 900000) + 100000)

  console.log(`smsAuthId: ${smsAuthId}, authNumber: ${authNumber}`)

  await redisClient.hSet(`auth-${smsAuthId}`, {
    authNumber: authNumber,
    fullfilled: 'false',
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

userRouter.post('/auth-code/check', async (req, res) => {
  const { smsAuthId } = req.cookies
  validation.check(smsAuthId, 'smsAuthId', validation.checkExist())

  const { authNumber, phoneNumber } = req.body
  validation.check(
    authNumber,
    'authNumber',
    validation.checkExist(),
    validation.checkRegExp(/\d{6}/),
  )

  const { authNumber: answer, phoneNumber: targetPhoneNumber } =
    await redisClient.hGetAll(`auth-${smsAuthId}`)
  const result = {
    result: 'success',
  }

  if (phoneNumber === targetPhoneNumber && authNumber === answer) {
    result.result = 'success'

    redisClient.hSet(`auth-${smsAuthId}`, {
      fullfilled: 'true',
    })
    redisClient.expire(`auth-${smsAuthId}`, 1800)
  } else {
    throw {
      result: 400,
      message: '잘못된 인증 정보입니다.',
    }
  }

  res.json(result)
})
