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
      validation.checkIsNumber(),
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
    validation.checkIsNumber(),
  )

  const session = res.locals.session

  if (Number(session.authorityLevel) === Number(process.env.ADMIN_AUTHORITY)) {
    next()
    return
  }

  res.locals.conditionString = 'AND author_id = $3'
  res.locals.condtionValue = [session.userId]

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

  const session = res.locals.session

  res.locals.needAnswer =
    session.authorityLevel !== process.env.ADMIN_AUTHORITY ? true : false

  if (req.files.length === 0) {
    next()
    return
  }

  const fileOrderSubArray = req.files.reduce((acc, file, index) => {
    acc.push(`$${index * 2 + 7}`)
    return acc
  }, [])
  const keySubarray = req.files.reduce((acc, file, index) => {
    acc.push(`$${index * 2 + 1 + 7}`)
    return acc
  }, [])
  const fileOrderArrayStirng = `unnest(ARRAY[${fileOrderSubArray.join(', ')}])`
  const keyArrayString = `unnest(ARRAY[${keySubarray.join(', ')}])`

  const valuesToInsertQuery = `,
  valuesToInsert AS (
    SELECT
      (SELECT id FROM inserted_article) AS inquiry_id,
      ${fileOrderArrayStirng} AS file_order,
      ${keyArrayString} AS key
  )`
  const fileInsertQuery = `${valuesToInsertQuery} INSERT INTO kkujjang.inquiry_file (inquiry_id, file_order, key)
  SELECT inquiry_id, CAST(file_order AS INTEGER), key
  FROM valuesToInsert`

  const fileValue = req.files.reduce((acc, file, index) => {
    acc.push(Number(index + 1), file)
    return acc
  }, [])

  res.locals.fileInsertQuery = fileInsertQuery
  res.locals.fileValue = fileValue

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
