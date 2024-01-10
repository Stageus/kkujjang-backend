import * as validation from '@utility/validation'

export const validatePageNumber = (req, res, next) => {
  const { page } = req.query

  validation.check(
    parseInt(page),
    'page',
    validation.checkExist(),
    validation.checkParsedNumberInRange(1, Infinity),
  )

  next()
}
