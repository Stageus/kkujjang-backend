import express from 'express'
import asyncify from 'express-asyncify'
import { configDotenv } from 'dotenv'
import { pgQuery } from '@database/postgres'
import { requireSignin, requireAdminAuthority } from '@middleware/auth'
import {
  validateInquiryGetBySearch,
  validateInquiryGetByList,
  validateInquiryGetByPathIndex,
  validateInquiryPost,
  validateInquiryupload,
} from '@middleware/inquiry'
import { validatePageNumber } from '@middleware/page'

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
    const { conditionString, conditionValue } = res.locals

    const searchedInquiry = (
      await pgQuery(
        `SELECT
        CEIL(inq_thread.count::float / 10) AS "lastPage",
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'needAnswer', inq_thread.need_answer,
            'id', inq_thread.id, 
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
  validateInquiryGetByList,
  async (req, res) => {
    const { page } = req.query
    const { conditionString = '', conditionValue = [] } = res.locals

    const listedInquiry = (
      await pgQuery(
        `SELECT
        CEIL(inq_thread.count::float / 10) AS "lastPage",
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'needAnswer', inq_thread.need_answer,
            'id', inq_thread.id, 
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

    res.json({
      result: listedInquiry,
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
    const { conditionString = '', conditionValue = [] } = res.locals

    const inquiryByInquiryId = (
      await pgQuery(
        `SELECT
        inq_thread.need_answer AS "needAnswer",
        inq_thread.thread_id AS "threadId",
        inq_thread.author_id AS "authorId",
        inq_thread.type AS "threadType",
        inq_thread.title AS "threadTitle",
        usr.nickname AS "nickname",
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
        
        WHERE inq_article.thread_id = (
          SELECT thread_id
          FROM kkujjang.inquiry_article
          WHERE id = $1 ${conditionString}
        )

        GROUP BY 
            inq_thread.need_answer, inq_thread.thread_id, inq_thread.author_id, 
            inq_thread.type, inq_thread.title, usr.nickname, 
            inq_thread.updated_at, inq_article.count`,
        [inquiryId, process.env.ADMIN_AUTHORITY, ...conditionValue],
      )
    ).rows

    if (inquiryByInquiryId.length === 0) {
      throw {
        statusCode: 404,
        message: '존재하지 않는 페이지입니다',
      }
    }

    res.json({
      result: inquiryByInquiryId,
    })
  },
)

// 문의 등록
inquiryRouter.post(
  '/',
  requireSignin,
  validateInquiryupload,
  validateInquiryPost,
  async (req, res) => {
    const session = res.locals.session

    const { title, content, id, type } = req.body

    const {
      fileInsertQuery = 'SELECT 1 FROM inserted_article LIMIT 1',
      fileValue = [],
      needAnswer,
    } = res.locals

    await pgQuery(
      `WITH
        inserted_article AS (
          INSERT INTO kkujjang.inquiry_article (author_id, thread_id, content)
          VALUES ($1, $2, $3)
          RETURNING author_id, id, thread_id
        ),
        inserted_thread AS (
          INSERT INTO kkujjang.inquiry_thread (need_answer, author_id, inquiry_id, thread_id, type, title)  
          SELECT $4, author_id, id, thread_id, $5, $6
          FROM inserted_article
          ON CONFLICT (thread_id)
          DO UPDATE SET need_answer = $4, updated_at = CURRENT_TIMESTAMP
        )
        ${fileInsertQuery}`,
      [session.userId, id, content, needAnswer, type, title, ...fileValue],
    )

    res.json({ result: 'success' })
  },
)
