import { configDotenv } from 'dotenv'
import { redisClient } from '@database/redis'
import { pgQuery } from '@database/postgres'
import express from 'express'
import asyncify from 'express-asyncify'
import * as kakao from '@utility/kakao'
import { getSession, createSession, destorySession } from '@utility/session'

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
