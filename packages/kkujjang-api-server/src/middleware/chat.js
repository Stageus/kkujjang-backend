import * as validation from 'kkujjang-validation'

export const validateChatSearchQuery = (req, res, next) => {
  const { userId, dateStart, dateEnd } = req.query

  userId &&
    validation.check(
      userId,
      'userId',
      validation.checkParsedNumberInRange(0, Infinity),
    )
  dateStart &&
    validation.check(
      dateStart,
      'dateStart',
      validation.checkRegExp(/^\d{4}\-\d{2}-\d{2} \d{2}:\d{2}$/),
    )
  dateEnd &&
    validation.check(
      dateEnd,
      'dateEnd',
      validation.checkRegExp(/^\d{4}\-\d{2}-\d{2} \d{2}:\d{2}$/),
    )

  next()
}
