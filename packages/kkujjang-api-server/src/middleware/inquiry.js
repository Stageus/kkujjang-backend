import * as uuid from 'uuid'
import { pgQuery } from 'postgres'
import * as validation from 'kkujjang-validation'

export const validateInquiryGetBySearch = (req, res, next) => {
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
      validation.checkParsedNumberInRange(0, 99),
    )
  }

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
    validation.checkParsedNumberInRange(0, 99),
  )

  next()
}

export const validateInquiryAuthority = async (req, res, next) => {
  const checkAuthor = req.params.inquiryId !== 'new' ? true : false
  const inquiryId =
    req.params.inquiryId === 'new' ? uuid.v4() : req.params.inquiryId

  validation.check(
    inquiryId,
    'inquiryId',
    validation.checkExist(),
    validation.checkRegExp(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
    ),
  )
  req.params.inquiryId = inquiryId

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
