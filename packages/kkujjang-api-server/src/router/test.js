// @ts-nocheck

import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import asyncify from 'express-asyncify'
import { pgQuery } from 'postgres'
import { configDotenv } from 'dotenv'
import { useMongoModel } from 'mongo-pool'
import { redisClient } from 'redis-cli'
import * as uuid from 'uuid'
import * as validation from 'kkujjang-validation'
import { authSession } from 'kkujjang-session'
import { upload } from 'kkujjang-multer'
import { validateBan } from '#middleware/ban'
import { requireSignin, requireAdminAuthority } from '#middleware/auth'
import { RabbitMQ } from 'rabbitmq'

configDotenv()

export const testRouter = asyncify(express.Router())

testRouter.get('/postgres/connection', async (req, res) => {
  console.log(
    `sending query to ... ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`,
  )

  const result = await pgQuery(`SELECT * FROM kkujjang_test.test;`)

  res.send(`connection successful, test result: ${JSON.stringify(result)}`)
})

testRouter.get('/redis/connection', async (req, res) => {
  console.log(
    `getting data from ... ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  )

  await redisClient.set('test', 'connection successful')
  const result = await redisClient.get('test')

  res.send(`connection successful, test result: ${result}`)
})

testRouter.post('/validation', async (req, res) => {
  const { username, password, nickname, phone } = req.body
  validation.check(
    username,
    `username`,
    validation.checkExist(),
    validation.checkLength(7, 30),
    validation.checkRegExp(/^(?=.*[a-z])(?=.*[0-9])[a-z0-9]+$/),
  )
  validation.check(
    password,
    `password`,
    validation.checkExist(),
    validation.checkLength(7, 30),
    validation.checkRegExp(
      /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[@#$%^&+=!\(\)])[a-zA-Z0-9@#$%^&+=!\(\)]+$/,
    ),
  )
  validation.check(
    nickname,
    `nickname`,
    validation.checkExist(),
    validation.checkLength(1, 15),
    validation.checkRegExp(/^[a-zA-Z0-9가-힣]+$/),
  )
  validation.check(
    phone,
    `phone`,
    validation.checkExist(),
    validation.checkRegExp(/^010-\d{4}-\d{4}$/),
  )
  res.send(`validation check successful`)
})

testRouter.get('/error/custom', async (req, res) => {
  throw {
    statusCode: 403,
    message: 'error message',
    messages: ['error 1', 'error 2', 'error 3'],
  }
})

testRouter.get('/error/server', async (req, res) => {
  await pgQuery(`invalidquery;`)
})

// 휴대폰 인증 성공 세션 생성(임시)
testRouter.post('/tempAuth-code', async (req, res) => {
  // Permission 체크 : 누구나
  // Permission 체크 끝

  const { phone } = req.body

  // body 값 유효성 검증
  validation.check(
    phone,
    'phone',
    validation.checkExist(),
    validation.checkRegExp(/^010-\d{4}-\d{4}$/),
  )
  // body 값 유효성 검증 끝

  const smsAuthId = uuid.v4()

  // 휴대폰 인증 성공 세션 생성
  await redisClient.hSet(`auth-${smsAuthId}`, {
    phoneNumber: phone,
    fulfilled: 'true',
  })
  await redisClient.expire(
    `auth-${smsAuthId}`,
    process.env.TEST_PHONE_VALIDATION_EXPIRES_IN,
  )
  // 휴대폰 인증 성공 세션 생성 끝

  res.json({ smsAuthId })
})

testRouter.get('/user/signed/:userId', async (req, res) => {
  const { userId } = req.params

  console.log(`Check if user ${userId} signed in...`)

  const result = {
    result: await authSession.isSignedIn(userId),
  }

  res.json(result)
})

testRouter.get('/user/session/admin', async (req, res) => {
  const sessionId = await authSession.create({
    userId: 1,
    authorityLevel: process.env.ADMIN_AUTHORITY,
  })

  res.json({ sessionId })
})

testRouter.get('/user/session/:userId', async (req, res) => {
  const { userId } = req.params

  const sessionId = await authSession.create({
    userId,
    authorityLevel: 1,
  })

  res.json({ sessionId })
})

testRouter.post(
  '/fileUpload',
  upload('test', {
    fileNameType: 'timestamp',
    fileSize: 1024 * 1024 * 6,
    maxFileCount: 3,
    allowedExtensions: ['jpg', 'jpeg', 'png', 'tif'],
  }),
  async (req, res) => {
    res.json({
      result: {
        text: req.body,
        files: req.files,
      },
    })
  },
)

testRouter.get(
  '/middleware',
  requireSignin,
  requireAdminAuthority,
  async (req, res) => {
    res.json(res.locals.session)
  },
)

testRouter.post('/regExp', async (req, res) => {
  const { str, regExp } = req.body
  res.json({
    type: typeof str,
    result: RegExp(regExp).test(str),
  })
})

testRouter.get('/redisFLUSHAll', async (req, res) => {
  await redisClient.flushAll()

  res.json({
    result: 'success',
  })
})

testRouter.get('/socket', function (req, res) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'socket_test.html'))
})

testRouter.put('/ban', validateBan, async (req, res) => {
  const { userId, bannedReason, bannedDays } = req.body
  const banChannel = await RabbitMQ.instance.connectToBanChannel()
  banChannel.sendToQueue(
    process.env.USER_BANNED_QUEUE_NAME,
    Buffer.from(
      JSON.stringify({ userId, bannedReason, bannedDays: Number(bannedDays) }),
    ),
  )
  await authSession.destroySessionByUserId(userId)

  const dateMills = Date.now() + Number(bannedDays) * 24 * 60 * 60 * 1000
  const bannedUntil = new Date(dateMills)
  await pgQuery(
    `UPDATE kkujjang.user
    SET is_banned = TRUE, banned_reason = $1, banned_until = $2
    WHERE id = $3`,
    [bannedReason, bannedUntil, userId],
  )

  res.send({ result: 'success' })
})

testRouter.get('/socket', function (req, res) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'socket_test.html'))
})
