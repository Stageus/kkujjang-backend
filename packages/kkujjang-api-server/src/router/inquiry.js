// @ts-nocheck

import express from 'express'
import asyncify from 'express-asyncify'
import { configDotenv } from 'dotenv'
import { pgQuery } from 'postgres'
import { requireSignin, requireAdminAuthority } from '#middleware/auth'
import {
  validateInquiryGetBySearch,
  validateInquiryGetByPathIndex,
  validateInquiryPost,
  validateInquiryAuthority,
} from '#middleware/inquiry'
import { validatePageNumber } from '#middleware/page'
import { upload } from 'kkujjang-multer'

configDotenv()

export const inquiryRouter = asyncify(express.Router())

// 문의 검색
inquiryRouter.get(
  '/search',
  requireAdminAuthority,
  validatePageNumber,
  validateInquiryGetBySearch,
  async (req, res) => {
    const { page } = req.query
    const { needAnswer = null, type = null } = req.query

    const conditionStrArray = []
    const conditionValue = []

    if (needAnswer !== null) {
      conditionValue.push(needAnswer)
      conditionStrArray.push(`AND need_answer = $${conditionValue.length}`)
    }

    if (type !== null) {
      conditionValue.push(type)
      conditionStrArray.push(`AND type = $${conditionValue.length}`)
    }

    const conditionString = conditionStrArray.join(' ')

    const searchedInquiry = (
      await pgQuery(
        `SELECT
        CEIL(inq_thread.count::float / 10) AS "lastPage",
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'needAnswer', inq_thread.need_answer,
            'id', inq_thread.start_inquiry_id, 
            'title', inq_thread.title,
            'createdAt', TO_CHAR(inq_thread.created_at, 'YYYY-MM-DD HH24:MI:SS'),
            'updatedAt', TO_CHAR(inq_thread.updated_at, 'YYYY-MM-DD HH24:MI:SS'),
            'type', inq_thread.type
          ) ORDER BY inq_thread.created_at DESC
        ) AS list
        FROM (
          SELECT *, COUNT(*) OVER() AS count
          FROM kkujjang.inquiry_thread
          WHERE 1 = 1 ${conditionString}
          ORDER BY created_at DESC
          OFFSET ${(Number(page) - 1) * 10} LIMIT 10
        ) inq_thread
        GROUP BY inq_thread.count`,
        conditionValue,
      )
    ).rows

    searchedInquiry.length === 0 &&
      searchedInquiry.push({ lastPage: 0, list: [] })

    res.json({
      result: searchedInquiry[0],
    })
  },
)

// 자신이 작성한 문의 목록 조회
inquiryRouter.get(
  '/list',
  requireSignin,
  validatePageNumber,
  async (req, res) => {
    const { page } = req.query

    const session = res.locals.session
    const conditionString =
      Number(session.authorityLevel) !== Number(process.env.ADMIN_AUTHORITY)
        ? 'WHERE author_id = $1'
        : ''

    const conditionValue = []
    Number(session.authorityLevel) !== Number(process.env.ADMIN_AUTHORITY) &&
      conditionValue.push(session.userId)

    const listedInquiry = (
      await pgQuery(
        `SELECT
        CEIL(inq_thread.count::float / 10) AS "lastPage",
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'needAnswer', inq_thread.need_answer,
            'id', inq_thread.start_inquiry_id, 
            'title', inq_thread.title,
            'createdAt', TO_CHAR(inq_thread.created_at, 'YYYY-MM-DD HH24:MI:SS'),
            'updatedAt', TO_CHAR(inq_thread.updated_at, 'YYYY-MM-DD HH24:MI:SS'),
            'type', inq_thread.type
          ) ORDER BY inq_thread.created_at DESC
        ) AS list

        FROM (
            SELECT *, COUNT(*) OVER() AS count
            FROM kkujjang.inquiry_thread
            ${conditionString}
            ORDER BY created_at DESC
            OFFSET ${(Number(page) - 1) * 10} LIMIT 10
        ) inq_thread

        GROUP BY inq_thread.count`,
        conditionValue,
      )
    ).rows

    listedInquiry.length === 0 && listedInquiry.push({ lastPage: 0, list: [] })

    res.json({
      result: listedInquiry[0],
    })
  },
)

// 게시글 id로 해당 문의 조회
inquiryRouter.get(
  '/:inquiryId',
  requireSignin,
  validatePageNumber,
  validateInquiryGetByPathIndex,
  async (req, res) => {
    const { page } = req.query
    const { inquiryId } = req.params

    const session = res.locals.session
    const conditionString =
      Number(session.authorityLevel) !== Number(process.env.ADMIN_AUTHORITY)
        ? 'AND author_id = $3'
        : ''
    const conditionValue = []
    Number(session.authorityLevel) !== Number(process.env.ADMIN_AUTHORITY) &&
      conditionValue.push(session.userId)

    const inquiryByInquiryId = (
      await pgQuery(
        `SELECT
        inq_thread.need_answer AS "needAnswer",
        inq_thread.thread_id AS "threadId",
        inq_thread.author_id AS "authorId",
        inq_thread.type AS "type",
        inq_thread.title AS "threadTitle",
        (SELECT nickname FROM kkujjang.user
        WHERE id = inq_thread.author_id) AS "nickname",
        TO_CHAR(inq_thread.updated_at, 'YYYY-MM-DD HH24:MI:SS') as "updatedAt",
        CEIL(inq_article.count::float / 10) AS "lastPage",

        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'isAnswer', CASE WHEN usr.authority_level = $2 THEN true ELSE false END,
            'authorId', inq_article.author_id,
            'content', inq_article.content,
            'file', inq_files.files
          ) ORDER BY inq_article.created_at ASC
        ) AS list

        FROM (
          SELECT *, COUNT(*) OVER() AS count
          FROM kkujjang.inquiry_article
          WHERE thread_id = (
            SELECT thread_id
            FROM kkujjang.inquiry_article
            WHERE id = $1 ${conditionString}
          )
          ORDER BY created_at ASC
          OFFSET(${(Number(page) - 1) * 10}) LIMIT 10
        ) inq_article

        LEFT JOIN kkujjang.inquiry_thread inq_thread ON inq_thread.thread_id = inq_article.thread_id
        LEFT JOIN kkujjang.user usr ON usr.id = inq_article.author_id
        LEFT JOIN (
          SELECT inquiry_id, ARRAY_AGG(key ORDER BY file_order ASC) AS files
          FROM kkujjang.inquiry_file
          GROUP BY inquiry_id
        ) inq_files ON inq_files.inquiry_id = inq_article.id  

        GROUP BY 
            inq_thread.need_answer, inq_thread.thread_id, inq_thread.author_id, 
            inq_thread.type, inq_thread.title, inq_thread.updated_at, 
            inq_article.count`,
        [inquiryId, process.env.ADMIN_AUTHORITY, ...conditionValue],
      )
    ).rows

    inquiryByInquiryId.length === 0 &&
      inquiryByInquiryId.push({ lastPage: 0, list: [] })

    res.json({
      result: inquiryByInquiryId[0],
    })
  },
)

// 문의 등록
inquiryRouter.post(
  '/:inquiryId',
  requireSignin,
  validateInquiryAuthority,
  upload((req) => `thread/${req.params.inquiryId}`, {
    fileNameType: 'timestamp',
    fileSize: 1024 * 1024 * 6,
    maxFileCount: 3,
    allowedExtensions: ['jpg', 'jpeg', 'png'],
  }),
  validateInquiryPost,
  async (req, res) => {
    const fileNumberLimit = 3
    const session = res.locals.session

    const { inquiryId } = req.params
    const { title, content, type } = req.body

    const keySubarray = req.files.reduce((acc, file, index) => {
      acc.push(`$${index + 7}`)
      return acc
    }, [])

    const fileLength = keySubarray.length
    const fileInsertQuery =
      fileLength === 0
        ? 'SELECT 1'
        : `, values_to_insert AS (
      SELECT
        (SELECT COUNT(*) 
        FROM inserted_article
        JOIN kkujjang.inquiry_file inq_file ON inq_file.inquiry_id = inserted_article.id) as count,
        (SELECT id FROM inserted_article) AS inquiry_id,
        UNNEST(ARRAY[${keySubarray.join(', ')}]) AS key
    )
    INSERT INTO kkujjang.inquiry_file (inquiry_id, file_order, key)
    SELECT inquiry_id, count + ROW_NUMBER() OVER(), key
    FROM values_to_insert
    WHERE count + ${fileLength} <= ${fileNumberLimit}`

    const fileValue = req.files

    const needAnswer =
      session.authorityLevel !== process.env.ADMIN_AUTHORITY ? true : false

    await pgQuery(
      `WITH
        inserted_article AS (
          INSERT INTO kkujjang.inquiry_article (author_id, thread_id, content)
          VALUES ($1, $2, $3)
          RETURNING author_id, id, thread_id
        ),
        inserted_thread AS (
          INSERT INTO kkujjang.inquiry_thread (need_answer, author_id, start_inquiry_id, thread_id, type, title)  
          SELECT $4, author_id, id, thread_id, $5, $6
          FROM inserted_article
          ON CONFLICT (thread_id)
          DO UPDATE SET need_answer = $4, updated_at = CURRENT_TIMESTAMP
        )
        ${fileInsertQuery}`,
      [
        session.userId,
        inquiryId,
        content,
        needAnswer,
        type,
        title,
        ...fileValue,
      ],
    )

    res.json({ result: 'success' })
  },
)
