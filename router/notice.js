import express from 'express'
import asyncify from 'express-asyncify'
import { getSession } from '@utility/session'
import { configDotenv } from 'dotenv'
import * as validtion from '@utility/validation'
import { pgQuery } from '@database/postgres'

configDotenv()

export const noticeRouter = asyncify(express.Router())

noticeRouter.post('/', async (req, res) => {
  const session = await getSession(req.cookies.sessionId)

  if (!session || session.authorityLevel !== process.env.ADMIN_AUTHORITY) {
    throw {
      status: 401,
      message: '권한이 없습니다.',
    }
  }

  const { title, content } = req.body
  validtion.check(title, 'title', validtion.checkExist())
  validtion.check(content, 'content', validtion.checkExist())

  await pgQuery(
    `INSERT INTO kkujjang.notice (title, content) VALUES ($1, $2);`,
    [title, content],
  )

  res.json({ result: 'success' })
})
