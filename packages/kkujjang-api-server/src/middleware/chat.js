import * as validation from 'kkujjang-validation'

export const validateChatSearchQuery = (req, res, next) => {
  const { userId, roomId, dateStart, dateEnd } = req.query

  userId &&
    validation.check(
      userId,
      'userId',
      validation.checkParsedNumberInRange(0, Infinity),
    )
  roomId &&
    validation.check(
      roomId,
      'roomId',
      validation.checkExist(),
      validation.checkRegExp(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
      ),
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
