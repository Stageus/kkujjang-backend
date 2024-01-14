import express from 'express'
import asyncify from 'express-asyncify'
import { pgQuery } from '@database/postgres'
import { configDotenv } from 'dotenv'
import { useMongoModel } from '@database/mongodb'
import { testSchema } from '@model/test'
import { redisClient } from '@database/redis'
import * as uuid from 'uuid'
import * as validation from '@utility/validation'
import { isSignedIn, createSession, getSession } from '@utility/session'
import { multer } from '@utility/kkujjang_multer/core'
import { s3CountFile } from '@utility/kkujjang_multer/s3'
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

testRouter.post('/fileUpload', async (req, res) => {
  // 업드할 파일 경로 (여기서는 test/에 업로드됩니다)
  const key = 'test'

  // 옵션
  const option = {
    // timestamp으로주면 timestamp-원래 파일명 (ex 1705140858101-fileName.png)
    // UUID로 주면 UUID.원래 파일 확장자 (ex) b9d4c9a7-c67f-4d72-bc1b-19d742edfc5b.png)
    fileNameType: 'timestamp',
    // 파일 하나당 최대 Byte
    fileSize: 1024 * 1024 * 6,
    // 파일의 최대 개수
    maxFileCount: 3,
    // 허가할 확장자
    // 생략시 기본값: 모든 확장자를 허가함
    allowedExtensions: ['jpg', 'jpeg', 'png', 'tif'],
  }

  await multer(req, key, option)

  res.json({
    result: {
      text: req.body,
      files: req.files,
    },
  })
})

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
