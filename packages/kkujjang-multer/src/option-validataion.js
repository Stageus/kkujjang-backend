export const validataion = (option) => {
  const {
    fileNameType = null,
    fileSize = null,
    maxFileCount = null,
    allowedExtensions = ['*'],
  } = option
  // option 불러오기 끝
  // option 검증
  if (fileNameType !== 'timestamp' && fileNameType !== 'UUID') {
    return makeValidResult(
      false,
      `fileNameType을 지정해주세요 : timestamp 또는 UUID`,
    )
  }

  if (fileSize === null) {
    return makeValidResult(
      false,
      `fileSize를 지정해주세요 : 0이 아닌 양의 정수`,
    )
  }
  if (!Number.isInteger(fileSize) || fileSize <= 0) {
    return makeValidResult(false, `fileSize는 0이 아닌 양의 정수이어야합니다.`)
  }

  if (maxFileCount === null) {
    return makeValidResult(
      false,
      `maxFileCount를 지정해주세요 : 0이 아닌 양의 정수`,
    )
  }
  if (!Number.isInteger(maxFileCount) || maxFileCount < 0) {
    return makeValidResult(
      false,
      `maxFileCount는 0 또는 양의 정수이어야합니다.`,
    )
  }

  if (!Array.isArray(allowedExtensions)) {
    return makeValidResult(false, 'allowedExtensions는 array 타입이어야합니다.')
  }

  return makeValidResult(true, '')
}

const makeValidResult = (valid, message) => {
  return {
    valid,
    message,
  }
}
