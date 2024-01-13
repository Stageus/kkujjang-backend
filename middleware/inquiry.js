import * as uuid from 'uuid'
import { pgQuery } from '@database/postgres'
import * as validation from '@utility/validation'
import { multer } from '@utility/kkujjang_multer/core'

export const validateInquiryGetBySearch = (req, res, next) => {
  const { needAnswer, type } = req.query

  const conditionStrArray = []
  const conditionValue = []

  if (needAnswer !== null && needAnswer !== undefined) {
    validation.check(
      needAnswer,
      'needAnswer',
      validation.checkExist(),
      validation.checkRegExp(/^(true|false)$/),
    )
    conditionValue.push(needAnswer)
    conditionStrArray.push(`AND need_answer = $${conditionValue.length}`)
  }

  if (type !== null && type !== undefined) {
    validation.check(
      type,
      'type',
      validation.checkExist(),
      validation.checkParsedNumberInRange(1, 99),
    )
    conditionValue.push(type)
    conditionStrArray.push(`AND type = $${conditionValue.length}`)
  }

  res.locals.conditionString = conditionStrArray.join(' ')
  res.locals.conditionValue = conditionValue

  next()
}

export const validateInquiryGetByList = (req, res, next) => {
  const session = res.locals.session
  if (session.authorityLevel === process.env.ADMIN_AUTHORITY) {
    next()
    return
  }

  res.locals.conditionString = 'WHERE author_id = $1'
  res.locals.conditionValue = [session.userId]

  next()
}

export const validateInquiryGetByPathIndex = (req, res, next) => {
  const { inquiryId } = req.params

  validation.check(
    inquiryId,
    'inquiryId',
    validation.checkExist(),
    validation.checkParsedNumberInRange(1, Infinity),
  )

  const session = res.locals.session

  if (Number(session.authorityLevel) === Number(process.env.ADMIN_AUTHORITY)) {
    next()
    return
  }

  res.locals.conditionString = 'AND author_id = $3'
  res.locals.conditionValue = [session.userId]

  next()
}

export const validateInquiryPost = (req, res, next) => {
  const { title, content, type } = req.body

  validation.check(
    title,
    'title',
    validation.checkExist(),
    validation.checkLength(1, 100),
  )
  validation.check(
    content,
    'content',
    validation.checkExist(),
    validation.checkLength(1, 2000),
  )
  validation.check(
    type,
    'type',
    validation.checkExist(),
    validation.checkRegExp(/^[0-9]$/),
  )

  next()
}

export const validateInquiryAuthority = async (req, res, next) => {
  const checkAuthor = req.params.id !== 'new' ? true : false
  const inquiryId = req.params.id === 'new' ? uuid.v4() : req.params.id

  validation.check(
    inquiryId,
    'inquiryId',
    validation.checkExist(),
    validation.checkRegExp(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
    ),
  )
  req.params.id = inquiryId

  const session = res.locals.session
  if (
    checkAuthor &&
    Number(session.authorityLevel) !== Number(process.env.ADMIN_AUTHORITY)
  ) {
    const valid = (
      await pgQuery(
        `SELECT COUNT(*) FROM kkujjang.inquiry_thread 
      WHERE author_id = $1 AND thread_id = $2`,
        [session.userId, inquiryId],
      )
    ).rows[0].count

    if (Number(valid) === 0) {
      throw {
        statusCode: 400,
        message: `validateInquiryupload | 작성할 권한이 없습니다`,
      }
    }
  }

  next()
}

export const validateInquiryupload = async (req, res, next) => {
  const inquiryId = req.params.id
  // multer 설정
  const key = `thread/${inquiryId}`

  const option = {
    allowedExtension: ['jpg', 'jpeg', 'png'],
  }

  const limits = {
    // 필드 이름의 최대 Byte
    fieldNameSize: 100,
    // 문자 value의 최대 Byte
    fieldSize: 1024 * 1024,
    // 텍스트 필드의 최대 개수
    fields: 3,
    // 파일 하나당 최대 Byte
    fileSize: 1024 * 1024 * 5,
    // 파일의 최대 개수
    files: 3,
  }
  // multer 설정 끝

  await multer(req, key, option, limits)

  next()
}
