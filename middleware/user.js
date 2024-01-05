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
