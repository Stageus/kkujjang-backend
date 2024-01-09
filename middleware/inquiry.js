import * as validation from '@utility/validation'
import { multer } from '@utility/kkujjang_multer/core'

export const validateInquirySearch = (req, res, next) => {
  const { needAnswer, type } = req.query

  if (needAnswer !== null && needAnswer !== undefined) {
    validation.check(
      needAnswer,
      'needAnswer',
      validation.checkExist(),
      validation.checkRegExp(/^(true|false)$/),
    )
  }

  if (type !== null && type !== undefined) {
    validation.check(
      type,
      'type',
      validation.checkExist(),
      validation.checkIsNumber(),
    )
  }

  next()
}

export const validateInquiryPathIndex = (req, res, next) => {
  const { inquiryId } = req.params
  console.log(inquiryId)

  validation.check(
    inquiryId,
    'inquiryId',
    validation.checkExist(),
    validation.checkIsNumber(),
  )

  next()
}

export const validateInquiryupload = async (req, res, next) => {
  const session = res.locals.session

  let author = null

  if (Number(session.authorityLevel) !== Number(process.env.ADMIN_AUTHORITY)) {
    author = {
      userId: session.userId,
      idColumnName: 'thread_id',
      tableName: 'kkujjang.inquiry',
    }
  }

  const options = {
    author,
    fileCountLimit: 3,
    allowedExtension: ['jpg', 'jpeg', 'png'],
  }

  const config = {
    fileSize: 1024 * 1024 * 5,
    fieldNameSize: 100,
  }

  const parseReuslt = await multer(req, config, options)
  req.body = parseReuslt.text
  req.files = parseReuslt.files

  next()
}

export const validateInquiry = (req, res, next) => {
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
