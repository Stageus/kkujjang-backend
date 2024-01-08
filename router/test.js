import express from 'express'
import asyncify from 'express-asyncify'
import { pgQuery } from '@database/postgres'
import { configDotenv } from 'dotenv'
import { useMongoModel } from '@database/mongodb'
import { testSchema } from '@model/test'
import { redisClient } from '@database/redis'
import * as uuid from 'uuid'
import * as validation from '@utility/validation'
import { isSignedIn, createSession } from '@utility/session'
import { multer } from '@utility/kkujjang-multer'
import { checkFileCount } from '@database/s3'
import { requireSignin, requireAdminAuthority } from '@middleware/auth'

configDotenv()

export const testRouter = asyncify(express.Router())

testRouter.get('/postgres/connection', async (req, res) => {
  console.log(
    `sending query to ... ${process.env.RDB_HOST}:${process.env.RDB_PORT}`,
  )

  const result = await pgQuery(`SELECT * FROM kkujjang_test.test;`)

  res.send(`connection successful, test result: ${JSON.stringify(result)}`)
})

testRouter.get('/mongodb/connection', async (req, res) => {
  console.log(
    `sending query to ... ${process.env.DDB_HOST}:${process.env.DDB_PORT}`,
  )

  const result = await useMongoModel('test', testSchema).find({})

  res.send(`connection successful, test result: ${JSON.stringify(result)}`)
})

testRouter.get('/redis/connection', async (req, res) => {
  console.log(
    `getting data from ... ${process.env.CACHE_HOST}:${process.env.CACHE_PORT}`,
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

  const authId = uuid.v4()

  // 휴대폰 인증 성공 세션 생성
  await redisClient.hSet(`auth-${authId}`, {
    phoeNumber: phone,
    fulfilled: 'true',
  })
  await redisClient.expire(
    `auth-${authId}`,
    process.env.TEST_PHONE_VALIDATION_EXPIRES_IN,
  )
  res.setHeader(
    'Set-Cookie',
    `smsAuthId=${authId}; Path=/; Secure; HttpOnly; Max-Age=3600`,
  )
  // 휴대폰 인증 성공 세션 생성 끝

  res.json({
    result: 'success',
  })
})

testRouter.get('/user/signed/:userId', async (req, res) => {
  const { userId } = req.params

  console.log(`Check if user ${userId} signed in...`)

  const result = {
    result: await isSignedIn(userId),
  }

  res.json(result)
})

testRouter.get('/user/session/admin', async (req, res) => {
  const sessionId = await createSession({
    userId: 1,
    authorityLevel: process.env.ADMIN_AUTHORITY,
  })

  res
    .setHeader(
      'Set-Cookie',
      `sessionId=${sessionId}; HttpOnly; Path=/; Secure; Max-Age=300`,
    )
    .json({
      result: 'success',
    })
})

testRouter.get('/user/session', async (req, res) => {
  const sessionId = await createSession({
    userId: 1,
    authorityLevel: process.env.ADMIN_AUTHORITY,
  })

  res
    .setHeader(
      'Set-Cookie',
      `sessionId=${sessionId}; HttpOnly; Path=/; Secure; Max-Age=300`,
    )
    .json({
      result: 'success',
    })
})

testRouter.get('/fileCount', async (req, res) => {
  const cnt = await checkFileCount('')
  res.send(`s3://${process.env.AWS_BUCKET_NAME}: ${cnt} files`)
})

testRouter.get('/fileCount/:id', async (req, res) => {
  const key = req.params.id
  const cnt = await checkFileCount(`${key}/`)
  res.send(`s3://${process.env.AWS_BUCKET_NAME}/${key}: ${cnt} files`)
})

testRouter.post('/fileUpload', async (req, res) => {
  const options = {
    // checkAuthor: {
    //   id: userId,
    //   idColumnName: thread_id,
    //   tableName: kkujjang.inquiry,
    // },
    fileCountLimit: 5,
    allowedExtension: ['jpg', 'jpeg', 'png'],
  }

  const config = {
    fileSize: 1024 * 1024 * 5,
    fieldNameSize: 100,
  }

  const message = await multer(req, config, options)

  res.send({
    result: 'success',
    message,
  })
})

testRouter.get(
  '/middleware',
  requireSignin,
  requireAdminAuthority,
  (req, res) => {
    res.json(res.locals.session)
  },
)
