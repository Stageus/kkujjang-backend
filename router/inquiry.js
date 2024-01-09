import express from 'express'
import asyncify from 'express-asyncify'
import { configDotenv } from 'dotenv'
import { pgQuery } from '@database/postgres'
import { requireSignin, requireAdminAuthority } from '@middleware/auth'
import {
  validateInquirySearch,
  validateInquiryPathIndex,
  validateInquiryupload,
  validateInquiry,
} from '@middleware/inquiry'
import { validatePageNumber } from '@middleware/page'

configDotenv()

export const inquiryRouter = asyncify(express.Router())

// 문의 검색
inquiryRouter.get(
  '/search',
  requireAdminAuthority,
  validateInquirySearch,
  validatePageNumber,
  async (req, res) => {
    const { page, needAnswer = null, type = null } = req.query
    const values = []
    let conditionArray = []

    if (needAnswer !== null) {
      values.push(needAnswer)
      conditionArray.push(`AND inq_na.need_answer = $${values.length}`)
    }

    if (type !== null) {
      values.push(type)
      conditionArray.push(`AND sub.type = $${values.length}`)
    }
    console.log()
    const conditionString = conditionArray.join(' ')

    const searchedInquiry = (
      await pgQuery(
        `SELECT
        CEIL(inq.count::float / 10) AS "lastPage",
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'needAnswer', inq.need_answer,
            'id', inq.id, 
            'title', inq.title,
            'createdAt', TO_CHAR(inq.created_at, 'YYYY-MM-DD HH24:MI:SS'),
            'updatedAt', TO_CHAR(inq.updated_at, 'YYYY-MM-DD HH24:MI:SS'),
            'type', inq.type
          ) ORDER BY inq.created_at DESC
        ) AS thread
      FROM (
          SELECT inq_na.need_answer, sub.id, sub.title, sub.created_at, sub.updated_at, sub.type,
          COUNT(*) OVER() AS count
          FROM 
            (SELECT id, author_id, title, created_at, updated_at, thread_id, type,
            ROW_NUMBER() OVER (PARTITION BY thread_id ORDER BY created_at ASC) AS rn
            FROM kkujjang.inquiry) sub
          LEFT JOIN kkujjang.inquiry_need_answer inq_na ON inq_na.thread_id = sub.thread_id
          WHERE sub.rn = 1 ${conditionString}
          ORDER BY sub.created_at DESC
          OFFSET ${(Number(page) - 1) * 10} LIMIT 10
      ) inq
      GROUP BY inq.count`,
        values,
      )
    ).rows

    res.json({
      result: searchedInquiry,
    })
  },
)

// 자신이 작성한 문의 목록 조회
inquiryRouter.get(
  '/list',
  requireSignin,
  validatePageNumber,
  async (req, res) => {
    const session = res.locals.session
    const { page } = req.query

    let conditionString = ''
    let values = []
    if (session.authorityLevel !== process.env.ADMIN_AUTHORITY) {
      conditionString = 'AND sub.author_id = $1'
      values.push(session.userId)
    }

    const listedInquiry = (
      await pgQuery(
        `SELECT
        CEIL(inq.count::float / 10) AS "lastPage",
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'needAnswer', inq_na.need_answer,
            'id', inq.id, 
            'title', inq.title,
            'createdAt', TO_CHAR(inq.created_at, 'YYYY-MM-DD HH24:MI:SS'),
            'updatedAt', TO_CHAR(inq.updated_at, 'YYYY-MM-DD HH24:MI:SS'),
            'type', inq.type
          ) ORDER BY inq.created_at DESC
        ) AS threads
      FROM (
          SELECT *, COUNT(*) OVER() AS count
          FROM 
            (SELECT id, author_id, title, created_at, updated_at, thread_id, type,
            ROW_NUMBER() OVER (PARTITION BY thread_id ORDER BY created_at ASC) AS rn
            FROM kkujjang.inquiry) sub
          WHERE sub.rn = 1 ${conditionString}
          ORDER BY sub.created_at DESC
          OFFSET ${(Number(page) - 1) * 10} LIMIT 10
      ) inq
      LEFT JOIN kkujjang.inquiry_need_answer inq_na ON inq.thread_id = inq_na.thread_id
      GROUP BY inq.count`,
        values,
      )
    ).rows

    res.json({
      result: listedInquiry,
    })
  },
)

// 게시글 id로 해당 문의 조회
inquiryRouter.get(
  '/:inquiryId',
  requireSignin,
  validateInquiryPathIndex,
  async (req, res) => {
    const session = res.locals.session
    const { inquiryId } = req.params
    const values = [inquiryId, process.env.ADMIN_AUTHORITY]

    let conditionString = ''
    if (
      Number(session.authorityLevel) !== Number(process.env.ADMIN_AUTHORITY)
    ) {
      conditionString = 'AND author_id = $3'
      values.push(session.userId)
    }

    const mainThread = (
      await pgQuery(
        `SELECT
      inq_na.need_answer AS "needAnswer",
      CASE
        WHEN usr.authority_level = $2 THEN true
        ELSE false
      END AS "isAnswer",
      inq.thread_id AS "threadId",
      inq.author_id AS "authorId", usr.nickname, inq.title AS "threadTitle", inq.content AS "threadContent",
      TO_CHAR(inq.updated_at, 'YYYY-MM-DD HH24:MI:SS') as "updatedAt",
      ARRAY_AGG(inq_f.key ORDER BY inq_f.file_order ASC) AS "threadFiles" 
      FROM kkujjang.inquiry inq
      LEFT JOIN kkujjang.inquiry_need_answer inq_na ON inq_na.thread_id = inq.thread_id
      LEFT JOIN kkujjang.inquiry_file inq_f ON inq_f.inquiry_id = inq.id
      LEFT JOIN kkujjang.user usr ON usr.id = inq.author_id 
      WHERE inq.thread_id = (
        SELECT thread_id
        FROM kkujjang.inquiry
        WHERE id = $1 ${conditionString}
      )
      GROUP BY inq.thread_id, usr.authority_level, usr.nickname, inq_na.need_answer, inq.author_id, inq.title, inq.content, inq.created_at, inq.updated_at
      ORDER BY inq.created_at ASC
      LIMIT 1`,
        values,
      )
    ).rows

    if (mainThread.length === 0) {
      throw {
        statusCode: 404,
        message: '존재하지 않는 페이지입니다',
      }
    }

    delete mainThread[0]['isAnswer']

    const subThread = (
      await pgQuery(
        `SELECT
      CASE
        WHEN usr.authority_level = $2 THEN true
        ELSE false
      END AS "isAnswer",
      inq.author_id AS "authorId", inq.title, inq.content,
      TO_CHAR(inq.updated_at, 'YYYY-MM-DD HH24:MI:SS') as "updatedAt",
      ARRAY_AGG(inq_f.key ORDER BY inq_f.file_order ASC) AS files
      FROM kkujjang.inquiry inq
      LEFT JOIN kkujjang.inquiry_need_answer inq_na ON inq_na.thread_id = inq.thread_id
      LEFT JOIN kkujjang.inquiry_file inq_f ON inq_f.inquiry_id = inq.id
      LEFT JOIN kkujjang.user usr ON usr.id = inq.author_id 
      WHERE inq.thread_id = (
        SELECT thread_id
        FROM kkujjang.inquiry
        WHERE id = $1 ${conditionString}
      )
      GROUP BY inq.thread_id, usr.authority_level, usr.nickname, inq_na.need_answer, inq.author_id, inq.title, inq.content, inq.created_at, inq.updated_at
      ORDER BY inq.created_at ASC
      OFFSET 1`,
        values,
      )
    ).rows

    res.json({
      result: {
        ...mainThread[0],
        thread: subThread,
      },
    })
  },
)

// 문의 등록
inquiryRouter.post(
  '/',
  requireSignin,
  validateInquiryupload,
  validateInquiry,
  async (req, res) => {
    const session = res.locals.session
    const needAnswer =
      session.authorityLevel === process.env.ADMIN_AUTHORITY ? true : false

    const { title, content, id, type } = req.body

    const inquiry = (
      await pgQuery(
        `WITH 
      new_inquiry AS (
        INSERT INTO kkujjang.inquiry (author_id, title, content, thread_id, type) VALUES ($1, $2, $3, $4, $5)
        RETURNING id, thread_id
      ),
      inserted_inquiry_need_answer AS (
        INSERT INTO kkujjang.inquiry_need_answer (thread_id, need_answer)
        SELECT ni.thread_id, $6
        FROM new_inquiry ni
        ON CONFLICT (thread_id)
        DO UPDATE SET need_answer = $6
      )
      SELECT id FROM new_inquiry`,
        [session.userId, title, content, id, type, needAnswer],
      )
    ).rows[0].id

    if (req.files.length === 0) {
      res.json({
        result: 'success  ',
      })
    }

    const fileQueryPrefix = `INSERT INTO kkujjang.inquiry_file (inquiry_id, file_order, key)`

    const fileAttributes = req.files.map((file, index) => ({
      order: index + 1,
      url: file,
      argOrder: (index + 1) * 2,
    }))

    const fileValues = [
      inquiry,
      ...fileAttributes.reduce(
        (prev, fileAttribute) => [
          ...prev,
          fileAttribute.order,
          fileAttribute.url,
        ],
        [],
      ),
    ]

    const valueStringArray = fileAttributes.map(
      (fileAttribute) =>
        `($1, $${fileAttribute.argOrder}, $${fileAttribute.argOrder + 1})`,
    )
    const valueString = valueStringArray.join(', ')
    const fileQuery = [fileQueryPrefix, 'VALUES', valueString].join(' ')

    await pgQuery(fileQuery, fileValues)

    res.json({ result: 'success' })
  },
)
