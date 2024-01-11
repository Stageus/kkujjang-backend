import express from 'express'
import asyncify from 'express-asyncify'
import { configDotenv } from 'dotenv'
import { pgQuery } from '@database/postgres'
import { requireAdminAuthority } from '@middleware/auth'
import {
  validateNotice,
  validateNoticePathIndex,
  validateNoticeSearch,
} from '@middleware/notice'
import { validatePageNumber } from '@middleware/page'

configDotenv()

export const noticeRouter = asyncify(express.Router())

noticeRouter.post(
  '/',
  requireAdminAuthority,
  validateNotice,
  async (req, res) => {
    const session = res.locals.session

    const { title, content } = req.body

    await pgQuery(
      `INSERT INTO kkujjang.notice (title, content, author_id) VALUES ($1, $2, $3);`,
      [title, content, session.userId],
    )

    res.json({ result: 'success' })
  },
)

noticeRouter.get('/list', validatePageNumber, async (req, res) => {
  const { page } = req.query

  const result = (
    await pgQuery(
      `SELECT
        id, title, content, created_at, views,
        CEIL(notice_count::float / 10) AS "lastPage"
      FROM
        (SELECT
          id, title, content, created_at, views, is_deleted,
          COUNT(*) OVER() AS notice_count
        FROM kkujjang.notice 
        WHERE is_deleted=FALSE
        ) AS sub_table
      WHERE is_deleted=FALSE
      ORDER BY created_at DESC
      OFFSET ${(Number(page) - 1) * 10} LIMIT 10`,
    )
  ).rows

  res.json({
    lastPage: result[0]?.lastPage ?? 0,
    list:
      result?.map(({ id, title, content, created_at, views }) => ({
        id,
        title,
        content,
        created_at,
        views,
      })) ?? [],
  })
})

noticeRouter.get(
  '/search',
  validatePageNumber,
  validateNoticeSearch,
  async (req, res) => {
    const { page, q: keyword } = req.query

    const result = (
      await pgQuery(
        `SELECT title, content, created_at, views 
      FROM kkujjang.notice 
      WHERE is_deleted=FALSE
      AND title LIKE '%${keyword}%'
      ORDER BY created_at DESC
      OFFSET ${(Number(page) - 1) * 10} LIMIT 10`,
      )
    ).rows

    res.json({ result })
  },
)

noticeRouter.get('/:noticeId', validateNoticePathIndex, async (req, res) => {
  const { noticeId } = req.params

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

noticeRouter.put(
  '/:noticeId',
  validateNoticePathIndex,
  requireAdminAuthority,
  validateNotice,
  async (req, res) => {
    const { noticeId } = req.params
    const { title, content } = req.body

    await pgQuery(
      `UPDATE kkujjang.notice SET title=$1, content=$2 
    WHERE id=$3 AND is_deleted=FALSE`,
      [title, content, noticeId],
    )

    res.json({ result: 'success' })
  },
)

noticeRouter.delete(
  '/:noticeId',
  requireAdminAuthority,
  validateNoticePathIndex,
  async (req, res) => {
    const { noticeId } = req.params

    await pgQuery(
      `UPDATE kkujjang.notice SET is_deleted=TRUE WHERE id=$1 AND is_deleted=FALSE`,
      [noticeId],
    )

    res.json({ result: 'success' })
  },
)
