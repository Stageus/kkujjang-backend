import * as validation from '@utility/validation'

export const validateSignInForm = (req, res, next) => {
  const { id = null, password = null } = req.body

  validation.check(
    id,
    'id',
    validation.checkExist(),
    validation.checkRegExp(/^[a-z0-9]{7,30}$/),
  )

  validation.check(
    password,
    'password',
    validation.checkExist(),
    validation.checkRegExp(
      // 영문 대문자, 소문자, 키보드 내 특수문자,
      RegExp(
        /(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[`~!@#$%^&*()_+\-=\[\]{};':",.<>/?])[A-Za-z0-9`~!@#$%^&*()_+\-=\[\]{};':",.<>/?]{7,30}/,
      ),
    ),
  )

  next()
}

export const valdiateSignUpForm = (req, res, next) => {
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
      /(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[`~!@#$%^&*()_+\-=\[\]{};':",.<>/?])[A-Za-z0-9`~!@#$%^&*()_+\-=\[\]{};':",.<>/?]{7,30}/,
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

export const validateAuthCodeQuery = (req, res, next) => {
  const { receiverNumber } = req.query

  validation.check(
    receiverNumber,
    'receiverNumber',
    validation.checkExist(),
    validation.checkRegExp(/010-\d{4}-\d{4}/),
  )

  next()
}
