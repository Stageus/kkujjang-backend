// @ts-nocheck

import express from 'express'
import asyncify from 'express-asyncify'
import { configDotenv } from 'dotenv'
import { pgQuery } from 'postgres'
import { requireAdminAuthority } from '#middleware/auth'
import {
  validateNotice,
  validateNoticePathIndex,
  validateNoticeSearch,
} from '#middleware/notice'
import { validatePageNumber } from '#middleware/page'
import { upload } from 'kkujjang-multer'

configDotenv()

export const noticeRouter = asyncify(express.Router())

noticeRouter.post(
  '/',
  requireAdminAuthority,
  upload('notice', {
    fileNameType: 'timestamp',
    fileSize: 1024 * 1024 * 10,
    maxFileCount: 3,
    allowedExtensions: ['jpg', 'jpeg', 'png'],
  }),
  validateNotice,
  async (req, res) => {
    const session = res.locals.session

    const { title, content } = req.body

    const keySubarray = req.files.reduce((acc, file, index) => {
      acc.push(`$${index + 4}`)
      return acc
    }, [])

    const fileLength = keySubarray.length
    const fileNumberLimit = 3
    const fileInsertQuery =
      fileLength === 0
        ? 'SELECT 1'
        : `, values_to_insert AS (
      SELECT
        (SELECT COUNT(*) 
        FROM inserted_notice
        JOIN kkujjang.notice_file not_file ON not_file.notice_id = inserted_notice.id) as count,
        (SELECT id FROM inserted_notice) AS notice_id,
        UNNEST(ARRAY[${keySubarray.join(', ')}]) AS key
      )
      INSERT INTO kkujjang.notice_file (notice_id, file_order, key)
      SELECT notice_id, count + ROW_NUMBER() OVER(), key
      FROM values_to_insert
      WHERE count + ${fileLength} <= ${fileNumberLimit}`

    await pgQuery(
      `WITH
        inserted_notice AS (
          INSERT INTO kkujjang.notice (title, content, author_id) VALUES ($1, $2, $3)
          RETURNING author_id, id
        )
        ${fileInsertQuery}`,
      [title, content, session.userId, ...req.files],
    )

    res.json({ result: 'success' })
  },
)

noticeRouter.get('/list', validatePageNumber, async (req, res) => {
  const { page } = req.query

  const result = (
    await pgQuery(
      `SELECT
        id, title, created_at, views,
        CEIL(notice_count::float / 10) AS "lastPage"
      FROM
        (SELECT
          id, title, created_at, views, is_deleted,
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
        `SELECT id, title, created_at AS "createdAt", views 
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
      `SELECT kkujjang.notice.id, title, content, kkujjang.notice.created_at, views, 
        ARRAY_AGG(key) AS files
      FROM kkujjang.notice 
        LEFT JOIN kkujjang.notice_file file ON file.notice_id = notice.id
      WHERE kkujjang.notice.id=$1 AND is_deleted=FALSE
      GROUP BY kkujjang.notice.id
      LIMIT 1`,
      [noticeId],
    )
  ).rows[0]

  if (Object.keys(result).length == 0) {
    throw {
      statusCode: 404,
      message: '공지를 찾을 수 없습니다.',
    }
  }

  if (result.files[0] === null) {
    result.files = null
  }

  res.json({ result })
})

noticeRouter.put(
  '/:noticeId',
  validateNoticePathIndex,
  requireAdminAuthority,
  upload('notice', {
    fileNameType: 'timestamp',
    fileSize: 1024 * 1024 * 10,
    maxFileCount: 0,
    allowedExtensions: ['jpg', 'jpeg', 'png'],
  }),
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
