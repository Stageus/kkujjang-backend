import express from 'express'
import asyncify from 'express-asyncify'
import { pgQuery } from '@database/postgres'
import { configDotenv } from 'dotenv'
import { useMongoModel } from '../database/mongodb'
import { testSchema } from '../models/test'
import { redisClient } from '@database/redis'
import { getFromRedis, setToRedis } from '../database/redis'
import * as v from '../utility/validation'

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

  await setToRedis('test', 'connection successful')
  const result = await getFromRedis('test')

  res.send(`connection successful, test result: ${result}`)
})

testRouter.post('/validation', async (req, res) => {
  const { username, password, nickname, phone } = req.body
  v.check(
    username,
    `username checking`,
    v.checkExist(),
    v.checkLength(7, 30),
    v.checkRegExp(/^(?=.*[a-z])(?=.*[0-9])[a-z0-9]+$/),
  )
  v.check(
    password,
    `password checking`,
    v.checkExist(),
    v.checkLength(7, 30),
    v.checkRegExp(
      /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[@#$%^&+=!\(\)])[a-zA-Z0-9@#$%^&+=!\(\)]+$/,
    ),
  )
  v.check(
    nickname,
    `nickname checking`,
    v.checkExist(),
    v.checkLength(1, 15),
    v.checkRegExp(/^[a-zA-Z0-9가-힣]+$/),
  )
  v.check(
    phone,
    `phone checking`,
    v.checkExist(),
    v.checkRegExp(/^010-\d{4}-\d{4}$/),
  )
  res.send(`validation check successful`)
})
