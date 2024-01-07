import * as validation from '@utility/validation'

export const validateNotice = (req, res, next) => {
  const { title, content } = req.body

  validation.check(
    title,
    'title',
    validation.checkExist(),
    validation.checkRegExp(/^[a-zA-Z0-9가-힣 -~]{1,100}/),
  )
  validation.check(content, 'content', validation.checkExist())

  next()
}

export const validateNoticeSearch = (req, res, next) => {
  const keyword = req.query.q

  validation.check(
    keyword,
    'keyword',
    validation.checkExist(),
    validation.checkRegExp(/^[a-zA-Z가-힣0-9 -~].+$/),
  )

  next()
}

export const validateNoticePathIndex = (req, res, next) => {
  const { noticeId } = req.params

  validation.check(
    noticeId,
    'noticeId',
    validation.checkExist(),
    validation.checkIsNumber(),
  )

  next()
}
