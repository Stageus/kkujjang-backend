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

export const validateReportSearch = (req, res, next) => {
  const {
    page = 1,
    reporterId = null,
    reporteeId = null,
    isOffensive = null,
    isPoorManner = null,
    isCheating = null,
  } = req.body

  validation.check(page, 'page', validation.checkIsNumber())
  reporterId &&
    validation.check(reporterId, 'reporterId', validation.checkIsNumber())
  reporteeId &&
    validation.check(reporteeId, 'reporteeId', validation.checkIsNumber())
  isOffensive &&
    validation.check(isOffensive, 'isOffensive', validation.checkIsNumber())
  isPoorManner &&
    validation.check(isPoorManner, 'isPoorManner', validation.checkIsNumber())
  isCheating &&
    validation.check(isCheating, 'isCheating', validation.checkIsNumber())

  next()
}

export const validateReportModification = (req, res, next) => {
  const { reportId } = req.params
  const { reportStatus } = req.body

  validation.check(
    reportId,
    'reportId',
    validation.checkExist(),
    validation.checkIsNumber(),
  )

  validation.check(
    reportStatus,
    'reportStatus',
    validation.checkExist(),
    validation.checkIsNumber(),
  )

  next()
}

export const validateReportPathIndex = (req, res, next) => {
  const { reportId } = req.params

  validation.check(
    reportId,
    'reportId',
    validation.checkExist(),
    validation.checkIsNumber(),
  )

  next()
}
