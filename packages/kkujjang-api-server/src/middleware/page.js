import * as validation from 'kkujjang-validation'

export const validatePageNumber = (req, res, next) => {
  const { page } = req.query

  validation.check(
    page,
    'page',
    validation.checkExist(),
    validation.checkParsedNumberInRange(1, Infinity),
  )

  next()
}
