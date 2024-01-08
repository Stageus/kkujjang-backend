import * as validation from '@utility/validation'

export const validatePageNumber = (req, res, next) => {
  const { page = 1 } = req.query

  validation.check(page, 'page', validation.checkIsNumber())

  next()
}
