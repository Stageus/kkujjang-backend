import { multer } from '@utility/kkujjang_multer/module/core'

export const upload = (key, option) => async (req, res, next) => {
  let myKey

  if (typeof key === 'function') {
    const cbResult = key(req)
    if (typeof cbResult !== 'string') {
      throw {
        statusCode: 400,
        message:
          'kkjjang-multer | 콜백함수에서 올바른 문자열을 리턴하지 않습니다',
      }
    }
    myKey = cbResult
  } else if (typeof key === 'string') {
    myKey = key
  } else {
    throw {
      statusCode: 400,
      message:
        'kkjjang-multer | key는 문자열 또는 문자열을 리턴하는 콜백함수여야 합니다',
    }
  }

  await multer(req, myKey, option)

  next()
}
