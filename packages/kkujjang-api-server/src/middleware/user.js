// @ts-nocheck

import * as validation from '#utility/validation'
import { configDotenv } from 'dotenv'
import { globalConfig } from '#root/global'

configDotenv()

export const validateKakaoSignIn = (req, res, next) => {
  const { code } = req.query

  validation.check(code, 'code', validation.checkExist())

  next()
}

export const validateSignIn = (req, res, next) => {
  const { username, password } = req.body

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
      /^(?=.*[a-zA-Z])(?=.*\d)[\x00-\x7F]{7,30}$/,
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
    validation.checkRegExp(/^(?=.*[a-zA-Z])(?=.*\d)[\x00-\x7F]{7,30}$/),
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
  const { avatarAccessoryIndex, nickname } = req.body
  const { authorityLevel } = res.locals.session

  try {
    validation.check(
      avatarAccessoryIndex,
      `avatarAccIndex`,
      validation.checkParsedNumberInRange(0, globalConfig.MAX_AVATAR_INDEX),
    )
  } catch (e) {
    throw {
      statusCode: 400,
      message: '존재하지 않는 아바타 액세서리 인덱스입니다.',
    }
  }

  validation.check(
    nickname,
    `nickname`,
    validation.checkExist(),
    validation.checkRegExp(/^[a-zA-Z0-9가-힣]{1,15}$/),
  )

  if (authorityLevel !== process.env.ADMIN_AUTHORITY) {
    try {
      validation.check(
        nickname,
        `nickname`,
        validation.checkRegExpUnmatch(/운영[진팀자]?/),
        validation.checkRegExpUnmatch(/관리[자팀]?/),
        validation.checkRegExpUnmatch(/[Aa][Dd][Mm][Ii][Nn]/),
      )
    } catch (e) {
      throw {
        statusCode: 400,
        message: '부적절한 닉네임입니다.',
      }
    }
  }

  next()
}

export const validateReceiverNumber = (req, res, next) => {
  const { receiverNumber } = req.query

  validation.check(
    receiverNumber,
    'receiverNumber',
    validation.checkExist(),
    validation.checkRegExp(/^010-\d{4}-\d{4}$/),
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
    validation.checkRegExp(/^\d{6}$/),
  )

  validation.check(
    phoneNumber,
    'phoneNumber',
    validation.checkExist(),
    validation.checkRegExp(/^010-\d{4}-\d{4}$/),
  )

  next()
}

export const validateCheckAccountExistForPasswordReset = (req, res, next) => {
  const { username, phone } = req.body

  validation.check(
    username,
    'username',
    validation.checkExist(),
    validation.checkLength(7, 30),
    validation.checkRegExp(/^[a-z0-9]{7,30}$/),
  )
  validation.check(
    phone,
    'phone',
    validation.checkExist(),
    validation.checkRegExp(/^010-\d{4}-\d{4}$/),
  )

  next()
}

export const validatePasswordReset = (req, res, next) => {
  const { username, phone } = req.body

  validation.check(
    username,
    'username',
    validation.checkExist(),
    validation.checkLength(7, 30),
    validation.checkRegExp(/^[a-z0-9]{7,30}$/),
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
  isBanned &&
    validation.check(isBanned, 'isBanned', validation.checkRegExp(/^0|1$/))

  next()
}

export const validateUsername = (req, res, next) => {
  const { username } = req.query

  validation.check(
    username,
    'username',
    validation.checkExist(),
    validation.checkRegExp(/^[a-z0-9]{7,30}$/),
  )

  next()
}
