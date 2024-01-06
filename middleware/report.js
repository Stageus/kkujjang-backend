import * as validation from '@utility/validation'

export const validateReport = (req, res, next) => {
  const {
    reporteeId = null,
    isOffensive = 0,
    isPoorManner = 0,
    isCheating = 0,
    note = '',
  } = req.body

  validation.check(
    reporteeId,
    'reporteeId',
    validation.checkExist(),
    validation.checkIsNumber(),
  )

  validation.check(isOffensive, 'isOffensive', validation.checkIsNumber())
  validation.check(isPoorManner, 'isPoorManner', validation.checkIsNumber())
  validation.check(isCheating, 'isCheating', validation.checkIsNumber())

  if (
    isOffensive === 0 &&
    isPoorManner === 0 &&
    isCheating === 0 &&
    note === ''
  ) {
    throw {
      statusCode: 400,
      message: '신고 사유를 입력해 주세요.',
    }
  }

  next()
}
