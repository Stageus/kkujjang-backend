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

  console.log(JSON.stringify(session))
  console.log(process.env.ADMIN_AUTHORITY)

  if (
    !session ||
    Number(session.authorityLevel) !== Number(process.env.ADMIN_AUTHORITY)
  ) {
    throw {
      status: 401,
      message: '권한이 없습니다.',
    }
  }

  const { title, content } = req.body
  validtion.check(title, 'title', validtion.checkExist())
  validtion.check(content, 'content', validtion.checkExist())

  await pgQuery(
    `INSERT INTO kkujjang.notice (title, content, author_id) VALUES ($1, $2, $3);`,
    [title, content, session.userId],
  )

  res.json({ result: 'success' })
})

noticeRouter.get('/list', async (req, res) => {
  const page = Number(req.query.page ?? 1)

  const result = (
    await pgQuery(
      `SELECT title, content, created_at, views 
      FROM kkujjang.notice 
      WHERE is_deleted=FALSE
      ORDER BY created_at DESC
      OFFSET ${(page - 1) * 10} LIMIT 10`,
    )
  ).rows

  res.json({ result })
})

noticeRouter.get('/:noticeId', async (req, res) => {
  const { noticeId } = req.params
  validtion.check(noticeId, 'noticeId', validtion.checkExist())

  const result = (
    await pgQuery(
      `SELECT title, content, created_at, views 
      FROM kkujjang.notice 
      WHERE id=$1 AND is_deleted=FALSE`,
      [noticeId],
    )
  ).rows[0]

  if (Object.keys(result).length == 0) {
    throw {
      statusCode: 404,
      message: '공지를 찾을 수 없습니다.',
    }
  }

  res.json({ result })
})

noticeRouter.put('/:noticeId', async (req, res) => {
  const session = await getSession(req.cookies.sessionId)

  if (
    !session ||
    Number(session.authorityLevel) !== Number(process.env.ADMIN_AUTHORITY)
  ) {
    throw {
      status: 401,
      message: '권한이 없습니다.',
    }
  }

  const { noticeId } = req.params
  validtion.check(noticeId, 'noticeId', validtion.checkExist())

  const { title, content } = req.body
  validtion.check(title, 'title', validtion.checkExist())
  validtion.check(content, 'content', validtion.checkExist())

  await pgQuery(
    `UPDATE kkujjang.notice SET title=$1, content=$2 
    WHERE id=$3 AND is_deleted=FALSE`,
    [title, content, noticeId],
  )

  res.json({ result: 'success' })
})

noticeRouter.delete('/:noticeId', async (req, res) => {
  const session = await getSession(req.cookies.sessionId)

  if (
    !session ||
    Number(session.authorityLevel) !== Number(process.env.ADMIN_AUTHORITY)
  ) {
    throw {
      status: 401,
      message: '권한이 없습니다.',
    }
  }

  const { noticeId } = req.params
  validtion.check(noticeId, 'noticeId', validtion.checkExist())

  const { title, content } = req.body
  validtion.check(title, 'title', validtion.checkExist())
  validtion.check(content, 'content', validtion.checkExist())

  await pgQuery(
    `UPDATE kkujjang.notice SET is_deleted=TRUE WHERE id=$1 AND is_deleted=FALSE`,
    [noticeId],
  )

  res.json({ result: 'success' })
})
