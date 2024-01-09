import * as validation from '@utility/validation'

export const validatePageNumber = (req, res, next) => {
  const { page = 1 } = req.query

  validation.check(
    parseInt(page),
    'page',
    validation.checkIsInNumberRange(1, Infinity),
  )

  next()
}
