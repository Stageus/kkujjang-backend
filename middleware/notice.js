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
