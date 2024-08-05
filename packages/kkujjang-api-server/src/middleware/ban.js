import * as validation from 'kkujjang-validation'

export const validateBan = (req, res, next) => {
  const { userId, bannedReason, bannedDays } = req.body

  validation.check(
    userId,
    'userId',
    validation.checkExist(),
    validation.checkParsedNumberInRange(1, Infinity),
  )

  validation.check(
    bannedReason,
    'bannedReason',
    validation.checkExist(),
    validation.checkLength(1, 100),
  )

  validation.check(
    bannedDays,
    'bannedDays',
    validation.checkExist(),
    validation.checkParsedNumberInRange(0, Infinity),
  )

  next()
}
