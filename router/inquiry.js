import express from 'express'
import asyncify from 'express-asyncify'
import { getSession } from '@utility/session'
import { configDotenv } from 'dotenv'
import * as validation from '@utility/validation'
import { pgQuery } from '@database/postgres'
import { fileAnalyzer } from '@utility/fileAnalyzer'

configDotenv()

export const inquiryRouter = asyncify(express.Router())

// 문의 검색
inquiryRouter.get('/search', async (req, res) => {
  // Permission 체크 : 관리자
  const page = Number(req.query.page ?? 1)
  const keyword = req.query.q

  validation.check(
    validation,
    'keyword',
    validation.checkExist(),
    validation.checkRegExp(/^[a-zA-Z가-힣0-9 ].+$/),
  )

  const result = (
    await pgQuery(
      `SELECT title, content, created_at, views 
      FROM kkujjang.notice 
      WHERE is_deleted=FALSE
      AND title LIKE '%${keyword}%'
      ORDER BY created_at DESC
      OFFSET ${(page - 1) * 10} LIMIT 10`,
    )
  ).rows

  res.json({ result })
})

// 자신이 게시한 문의 목록 조회
inquiryRouter.get('/list', async (req, res) => {
  // Permission 체크 : 사용자, 관리자
  const sessionId = req.cookies.sessionId
  if (!sessionId) {
    throw {
      statusCode: 401,
      message: '로그인하지 않은 상태입니다.',
    }
  }
  // Permission 체크 : 사용자, 관리자 끝

  const page = Number(req.query.page ?? 1)

  const result = (
    await pgQuery(
      `SELECT authorId, threadId, updataed_at, title, content, created_at, views 
      FROM kkujjang.inquiry
      ORDER BY created_at DESC
      OFFSET ${(page - 1) * 10} LIMIT 10`,
    )
  ).rows

  res.json({ result })
})

// 문의 등록
inquiryRouter.post('/', async (req, res) => {
  // Permission 체크 : 사용자, 관리자
  const sessionId = req.cookies.sessionId
  if (!sessionId) {
    throw {
      statusCode: 401,
      message: '로그인하지 않은 상태입니다.',
    }
  }

  const session = await getSession(req.cookies.sessionId)
  let type = 0
  // 관리자가 답변 달았다면 type = 1로
  // 유저가 답변 달았다면 type = 0으로
  if (Number(session.authorityLevel) === Number(process.env.ADMIN_AUTHORITY)) {
    type = 1
  }
  // Permission 체크 끝

  const options = {
    // 값을 전달하면 해당 사용자가 주어진 폴더(${id}/)에 쓰기 권한이 있는지 검증한다
    checkAuthor:
      type == 0
        ? {
            // 사용자의 인덱스 아이디
            authorId: session.userId,
            // 게시판 테이블 이름
            table: 'inquiry',
            // 검증할 컬럼
            columnName: 'thread_id',
          }
        : false,
    // edit 타입이면 aws S3에 존재한 파일 개수를 가져온다
    type: 'new',
    // 해당 id에 올라 갈 수 있는 최대 파일의 개수이다
    allowedFileCount: 3,
    // 허용할 확장자 종류
    allowedExtension: ['jpg', 'jpeg', 'png'],
  }

  // 파일 하나당 10MB 제한
  const bbConfig = {
    // 파일 하나당 사이즈
    fileSize: 1024 * 1024 * 11,
    // 파일 이름 최대 크기
    fieldNameSize: 100,
  }

  // form-data 분석
  const message = await fileAnalyzer(req, bbConfig, options).catch((err) => {
    throw err
  })

  if (message.err.length) {
    throw {
      statusCode: 400,
      message: JSON.stringify(message.err),
    }
  }

  let { id, title, content } = message.text
  validation.check(title, 'title', validation.checkExist())
  validation.check(content, 'content', validation.checkExist())

  let queryString = `INSERT INTO kkujjang.inquiry (author_id, title, content, thread_id, type) 
  VALUES ($1, $2, $3, $4, $5)
  RETURNING id`
  let values = [session.userId, title, content, id, type]
  const queryRes = await pgQuery(queryString, values)

  if (!message.files.length) {
    res.json({
      result: id,
    })
  }

  queryString = `INSERT INTO kkujjang.inquiry_file (inquiry_id, file_order, key) `
  values = [queryRes.rows[0].id]
  let fileOrder = 1
  let conditionCnt = 0
  for (const file of message.files) {
    values.push(fileOrder++)
    values.push(file.url)
    conditionCnt += 2
  }

  for (let start = 2; start <= conditionCnt; start += 2) {
    if (start == 2) {
      queryString += `VALUES `
    }
    queryString += `($1, $${start}, $${start + 1}), `
  }

  if (conditionCnt) {
    queryString = queryString.slice(0, -2)
  }

  await pgQuery(queryString, values)

  res.json({ result: id })
})

inquiryRouter.get('/:noticeId', async (req, res) => {
  const { noticeId } = req.params
  validation.check(noticeId, 'noticeId', validation.checkExist())

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

// 문의 조회
inquiryRouter.put('/:noticeId', async (req, res) => {
  const session = await getSession(req.cookies.sessionId)

  if (
    !session ||
    Number(session.authorityLevel) !== Number(process.env.ADMIN_AUTHORITY)
  ) {
    throw {
      statusCode: 401,
      message: '권한이 없습니다.',
    }
  }

  const { noticeId } = req.params
  validation.check(noticeId, 'noticeId', validation.checkExist())

  const { title, content } = req.body
  validation.check(title, 'title', validation.checkExist())
  validation.check(content, 'content', validation.checkExist())

  await pgQuery(
    `UPDATE kkujjang.notice SET title=$1, content=$2 
    WHERE id=$3 AND is_deleted=FALSE`,
    [title, content, noticeId],
  )

  res.json({ result: 'success' })
})
