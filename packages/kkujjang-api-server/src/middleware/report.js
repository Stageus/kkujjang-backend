import * as validation from 'kkujjang-validation'

export const validateReport = (req, res, next) => {
  const { reporteeId, isOffensive, isPoorManner, isCheating, note } = req.body

  validation.check(
    reporteeId,
    'reporteeId',
    validation.checkExist(),
    validation.checkParsedNumberInRange(1, Infinity),
  )

  validation.check(
    isOffensive,
    'isOffensive',
    validation.checkExist(),
    validation.checkRegExp(/^true|false$/),
  )
  validation.check(
    isPoorManner,
    'isPoorManner',
    validation.checkExist(),
    validation.checkRegExp(/^true|false$/),
  )
  validation.check(
    isCheating,
    'isCheating',
    validation.checkExist(),
    validation.checkRegExp(/^true|false$/),
  )

  if (
    isOffensive === false &&
    isPoorManner === false &&
    isCheating === false &&
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
  const { reporterId, reporteeId, isOffensive, isPoorManner, isCheating } =
    req.query

  reporterId &&
    validation.check(
      reporterId,
      'reporterId',
      validation.checkParsedNumberInRange(1, Infinity),
    )
  reporteeId &&
    validation.check(
      reporteeId,
      'reporteeId',
      validation.checkParsedNumberInRange(1, Infinity),
    )
  isOffensive &&
    validation.check(
      isOffensive,
      'isOffensive',
      validation.checkRegExp(/^0|1$/),
    )
  isPoorManner &&
    validation.check(
      isPoorManner,
      'isPoorManner',
      validation.checkRegExp(/^0|1$/),
    )
  isCheating &&
    validation.check(isCheating, 'isCheating', validation.checkRegExp(/^0|1$/))

  next()
}

export const validateReportModification = (req, res, next) => {
  const { reportStatus } = req.body

  validation.check(
    reportStatus,
    'reportStatus',
    validation.checkExist(),
    validation.checkRegExp(/^0|1$/),
  )

  next()
}

export const validateReportPathIndex = (req, res, next) => {
  const { reportId } = req.params

  validation.check(
    reportId,
    'reportId',
    validation.checkExist(),
    validation.checkParsedNumberInRange(1, Infinity),
  )

  next()
}
