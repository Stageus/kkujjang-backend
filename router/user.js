import { configDotenv } from 'dotenv'
import { pgQuery } from '@database/postgres'
import express from 'express'
import asyncify from 'express-asyncify'
import * as kakao from '@utility/kakao'
import { getSession, createSession, destorySession } from '@utility/session'
import { isSignedIn } from '@utility/session'
import {
  createSmsAuthSession,
  isValidSmsAuthorization,
  sendSMS,
} from '@utility/sms-auth'
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
  validateUserSearch,
  validateUsername,
} from '@middleware/user'
import { validatePageNumber } from '@middleware/page'

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
    `SELECT count(*) AS count 
    FROM kkujjang.user 
    WHERE kakao_id=$1 AND is_deleted=FALSE;`,
    [kakaoId],
  )

  // 첫 로그인 시 DB에 정보 저장
  if (firstSigninValidation.rows[0].count == 0) {
    console.log('First Login...')

    await pgQuery(
      `INSERT INTO kkujjang.user (kakao_id) 
      VALUES ($1);`,
      [kakaoId],
    )
  }

  const { id: userId, authority_level: authorityLevel } = (
    await pgQuery(
      `SELECT id, authority_level 
      FROM kkujjang.user 
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

  await pgQuery(
    `UPDATE kkujjang.user 
    SET is_deleted = TRUE 
    WHERE id=$1`,
    [userId],
  )

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

  const authNumber = String(Math.floor(Math.random() * 900000) + 100000)

  const smsAuthId = await createSmsAuthSession(authNumber, receiverNumber)
  const sendSmsResult = await sendSMS(
    receiverNumber,
    `끝짱 인증번호: ${authNumber}`,
  )
  console.log(sendSmsResult)

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

  const result = {
    result: 'success',
  }

  const isValid = await isValidSmsAuthorization(
    authNumber,
    phoneNumber,
    smsAuthId,
  )

  if (!isValid) {
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

  const result = await pgQuery(
    `SELECT id, authority_level 
    FROM kkujjang.user
    WHERE username = $1 AND password = crypt($2, password) AND is_deleted=FALSE`,
    [username, password],
  )

  if (result.rowCount === 0) {
    throw {
      statusCode: 401,
      message: '존재하지 않는 계정 정보입니다.',
    }
  }

  const { id: userId, authority_level: authorityLevel } = result.rows[0]

  // 다른 기기에서 접속중인 계정 확인
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

  res
    .setHeader(
      'Set-Cookie',
      `sessionId=${sessionId}; Path=/; Secure; HttpOnly; Max-Age=7200`,
    )
    .json({
      result: 'suecess',
    })
})

// 특정 조건에 맞는 사용자 검색
userRouter.get(
  '/search',
  requireAdminAuthority,
  validateUserSearch,
  validatePageNumber,
  async (req, res) => {
    const { username = null, nickname = null, isBanned = null } = req.query
    const { page } = req.query

    const result = (
      await pgQuery(
        `SELECT  
          CEIL(user_count::float / 10) AS "lastPage",
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'id', id,
              'username', username,
              'nickname', nickname,
              'isBanned', is_banned
            ) ORDER BY created_at DESC
          ) AS list
        FROM (
          SELECT id, username, nickname, is_banned, created_at,
            COUNT(*) OVER() AS user_count
          FROM kkujjang.user
          WHERE 
            is_deleted = FALSE
            AND ${username === null ? '$1=$1' : 'username LIKE $1'}
            AND ${nickname === null ? '$2=$2' : 'nickname LIKE $2'}
            AND ${isBanned === null ? '$3=$3' : 'is_banned = $3'}
            ORDER BY created_at DESC
            OFFSET ${(Number(page) - 1) * 10} LIMIT 10
        ) AS sub_table
        GROUP BY user_count`,
        [
          username === null ? '!' : `%${username}%`,
          nickname === null ? '!' : `%${nickname}%`,
          isBanned === null ? 0 : isBanned,
        ],
      )
    ).rows

    result.length === 0 && result.push({ lastPage: 0, list: [] })

    res.json({
      result: result[0],
    })
  },
)

// 비밀번호 재설정
userRouter.post(
  '/find/pw',
  allowGuestOnly,
  requireSmsAuth,
  validatePasswordReset,
  async (req, res) => {
    const { username, newPassword, phone } = req.body

    const result = (
      await pgQuery(
        `WITH 
        is_valid AS (
          SELECT count(*) AS count 
          FROM kkujjang.user 
          WHERE username = $1 AND phone = $2 AND is_deleted = FALSE
        )
        UPDATE kkujjang.user 
        SET password = crypt($3, gen_salt('bf')) 
        WHERE
          (SELECT count FROM is_valid) = 1
          AND username = $1
          AND phone = $2
          AND is_deleted = FALSE
        RETURNING (SELECT count FROM is_valid)`,
        [username, phone, newPassword],
      )
    ).rows

    if (result.length === 0) {
      throw {
        statusCode: 400,
        message: '해당하는 계정 정보가 존재하지 않습니다.',
      }
    }

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

    const result = (
      await pgQuery(
        `SELECT username FROM kkujjang.user WHERE phone = $1 AND is_deleted = FALSE`,
        [phone],
      )
    ).rows

    const { username } = result[0]

    res.json({
      result: username,
    })
  },
)

// 인덱스를 이용한 사용자 조회
userRouter.get('/:userId', requireSignin, async (req, res) => {
  const { userId } = req.params
  const { authorityLevel } = res.locals.session

  const foundUsers = (
    await pgQuery(
      `SELECT 
        level, 
        exp, 
        nickname, 
        CASE 
          WHEN wins = 0 AND loses = 0 THEN 0.0
          WHEN loses = 0 THEN 100.0
          ELSE ROUND((wins * 1.0 / (wins + loses)) * 100, 2)
        END AS "winRate"${
          authorityLevel === process.env.ADMIN_AUTHORITY
            ? `,
        is_banned AS "isBanned", 
        banned_reason AS "bannedReason"`
            : ''
        } 
      FROM kkujjang.user 
      WHERE id = $1 AND is_deleted = FALSE`,
      [userId],
    )
  ).rows

  if (foundUsers.length === 0) {
    throw {
      statusCode: 400,
      message: '존재하지 않는 사용자입니다.',
    }
  }

  res.json({ result: foundUsers[0] })
})

// 회원 탈퇴
userRouter.delete('/', requireSignin, async (req, res) => {
  const { sessionId } = req.cookies
  const { userId } = res.locals.session

  await pgQuery(
    `UPDATE kkujjang.user 
    SET kakao_id = NULL, username = NULL, phone = NULL, is_deleted = TRUE 
    WHERE id = $1`,
    [userId],
  )

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
    const { userId } = res.locals.session

    await pgQuery(
      `UPDATE kkujjang.user 
      SET nickname = $1 || '#' || CAST(id AS VARCHAR)  
      WHERE id = $2`,
      [nickname, userId],
    )

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

    const defaultNickname = '끝짱'

    const result = (
      await pgQuery(
        `WITH my_serial AS (
          SELECT nextval('kkujjang.user_id_seq'::regclass) AS id
        )
        INSERT INTO kkujjang.user (id, username, password, phone, nickname)
        SELECT 
            my_serial.id, 
            $1, 
            crypt($2, gen_salt('bf')), 
            $3, 
            '${defaultNickname}' || '#' || CAST(my_serial.id AS VARCHAR)
        FROM my_serial
        WHERE NOT EXISTS (
            SELECT 1
            FROM kkujjang.user
            WHERE (username = CAST($1 AS VARCHAR) 
              OR phone = CAST($3 AS VARCHAR))
              AND is_deleted = false
        )
        RETURNING id`,
        [username, password, phone],
      )
    ).rows

    if (result.length !== 1) {
      throw {
        statusCode: 400,
        message: '회원가입에 실패했습니다.',
      }
    }

    res.json({
      result: 'success',
    })
  },
)

userRouter.get(
  '/username/availability',
  allowGuestOnly,
  validateUsername,
  async (req, res) => {
    const { username } = req.query

    const count = (
      await pgQuery(
        `SELECT COUNT(*) AS "count"
        FROM kkujjang.user 
        WHERE username = $1`,
        [username],
      )
    ).rows[0].count

    res.json({
      result: Number(count) === 0,
    })
  },
)
