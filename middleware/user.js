import * as validation from '@utility/validation'

export const validateSignIn = (req, res, next) => {
  const { username = null, password = null } = req.body

  validation.check(
    username,
    'username',
    validation.checkExist(),
    validation.checkRegExp(/^[a-z0-9]{7,30}$/),
  )

  validation.check(
    password,
    'password',
    validation.checkExist(),
    validation.checkRegExp(
      // 영문 대문자, 소문자, 키보드 내 특수문자,
      /(?=.*[a-zA-Z])(?=.*\d)(?=.*[`~!@#$%^&*()_+\-=\[\]{};':",.<>/?])[A-Za-z0-9`~!@#$%^&*()_+\-=\[\]{};':",.<>/?]{7,30}/,
    ),
  )

  next()
}

export const validateSignUp = (req, res, next) => {
  const { username, password, phone } = req.body

  validation.check(
    username,
    'username',
    validation.checkExist(),
    validation.checkLength(7, 30),
    validation.checkRegExp(/^[a-z0-9]{7,30}$/),
  )
  validation.check(
    password,
    'password',
    validation.checkExist(),
    validation.checkLength(7, 30),
    validation.checkRegExp(
      /(?=.*[a-zA-Z])(?=.*\d)(?=.*[`~!@#$%^&*()_+\-=\[\]{};':",.<>/?])[A-Za-z0-9`~!@#$%^&*()_+\-=\[\]{};':",.<>/?]{7,30}/,
    ),
  )
  validation.check(
    phone,
    'phone',
    validation.checkExist(),
    validation.checkRegExp(/^010-\d{4}-\d{4}$/),
  )

  next()
}

export const validateUserModification = (req, res, next) => {
  const { nickname } = req.body

  validation.check(
    nickname,
    `nickname`,
    validation.checkExist(),
    validation.checkRegExp(/^[a-zA-Z0-9가-힣]{1,15}$/),
  )

  next()
}

export const validateReceiverNumber = (req, res, next) => {
  const { receiverNumber } = req.query

  validation.check(
    receiverNumber,
    'receiverNumber',
    validation.checkExist(),
    validation.checkRegExp(/010-\d{4}-\d{4}/),
  )

  next()
}

export const validateAuthCodeCheck = (req, res, next) => {
  const { smsAuthId } = req.cookies
  const { authNumber, phoneNumber } = req.body

  validation.check(smsAuthId, 'smsAuthId', validation.checkExist())

  validation.check(
    authNumber,
    'authNumber',
    validation.checkExist(),
    validation.checkRegExp(/\d{6}/),
  )

  validation.check(
    phoneNumber,
    'phoneNumber',
    validation.checkExist(),
    validation.checkRegExp(/010-\d{4}-\d{4}/),
  )

  next()
}

export const validatePasswordReset = (req, res, next) => {
  const { username, newPassword, phone } = req.body

  validation.check(
    username,
    'username',
    validation.checkExist(),
    validation.checkRegExp(/^[a-z0-9]{7,30}$/),
  )

  validation.check(
    newPassword,
    'newPassword',
    validation.checkExist(),
    validation.checkRegExp(
      /(?=.*[a-zA-Z])(?=.*\d)(?=.*[`~!@#$%^&*()_+\-=\[\]{};':",.<>/?])[A-Za-z0-9`~!@#$%^&*()_+\-=\[\]{};':",.<>/?]{7,30}/,
    ),
  )

  validation.check(
    phone,
    'phone',
    validation.checkExist(),
    validation.checkRegExp(/^010-\d{4}-\d{4}$/),
  )

  next()
}

export const validateUserSearch = (req, res, next) => {
  const { username, nickname, isBanned } = req.query

  username &&
    validation.check(
      username,
      'username',
      validation.checkRegExp(/^[a-z0-9]+$/),
    )
  nickname &&
    validation.check(
      nickname,
      'nickname',
      validation.checkRegExp(/^[a-zA-Z0-9가-힣]+$/),
    )
  isBanned && validation.check(isBanned, 'isBanned', validation.checkIsNumber())

  next()
}

export const validateUsername = (req, res, next) => {
  const { username } = req.query

  validation.check(
    username,
    'username',
    validation.checkRegExp(/^[a-z0-9]{7,30}$/),
  )

  next()
}
