import * as validation from 'kkujjang-validation'

export const validateRoomSearch = (req, res, next) => {
  const { roomId } = req.query

  validation.check(
    roomId,
    'roomId',
    validation.checkExist(),
    validation.checkRegExp(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
    ),
  )

  next()
}
