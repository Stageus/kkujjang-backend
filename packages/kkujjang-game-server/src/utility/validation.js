// curry는 inputValues의 개수에 따라
// 다시 한번 inputValues를 요구하는 함수를 return해줄지
// 곧바로 inputValues를 func에 전달하여 실행해줄지 결정해줍니다.
const curry =
  (func) =>
  (...inputValues) => {
    if (func.length <= inputValues.length) {
      return func(...inputValues)
    }
    return (...appendValues) => curry(func)(...inputValues, ...appendValues)
  }

// combine 전달받은 변수와 함수를 가공하여
// 하나의 값을 return 또는 throw해 줍니다.
// 결국 iter를 하나의 값으로 압축했기 때문에 combine 함수입니다.
const combine = (iter) => {
  const args = iter[Symbol.iterator]()

  const target = args.next().value
  const targetName = args.next().value

  Array.from(args).forEach((func) => func(target, targetName))
}

export const checkExist = curry((target, targetName) => {
  if (target === '' || target === null || target === undefined) {
    throw {
      statusCode: 400,
      message: `값이 존재하지 않습니다. (${targetName}: ${target})`,
    }
  }
})

export const checkLength = curry((min, max, target, targetName) => {
  if (target.length < min) {
    throw {
      statusCode: 400,
      message: `길이가 너무 짧습니다. (${targetName}: ${target})`,
    }
  }

  if (max < target.length) {
    throw {
      statusCode: 400,
      message: `길이가 너무 깁니다. (${targetName}: ${target})`,
    }
  }
})

export const checkRegExp = curry((std, target, targetName) => {
  if (!RegExp(std).test(target)) {
    throw {
      statusCode: 400,
      message: `정규표현식(${std.toString()})과 일치하지 않습니다. (${targetName}: ${target})`,
    }
  }
})

export const checkRegExpUnmatch = curry((std, target, targetName) => {
  if (RegExp(std).test(target)) {
    throw {
      statusCode: 400,
      message: `정규표현식(${std.toString()})에 의해 금지된 문자열입니다. (${targetName}: ${target})`,
    }
  }
})

export const checkSame = curry((sameTarget, target, targetName) => {
  if (target !== sameTarget) {
    return `비교 대상(${sameTarget})과 일치하지 않는 값입니다. (${targetName}: ${target})`
  }
})

const isNumberParsableString = (target) => /^\d+$/.test(target)

export const checkIsNumberParsableString = curry((target, targetName) => {
  if (!isNumberParsableString(target)) {
    throw {
      statusCode: 400,
      message: `대상이 숫자가 아닙니다. (${targetName}: ${target})`,
    }
  }
})

// min, max inclusive (>=, <=)
export const checkParsedNumberInRange = curry(
  (min, max, target, targetName) => {
    const targetNumber = Number(target)

    if (
      !isNumberParsableString(target) ||
      targetNumber < min ||
      targetNumber > max
    ) {
      throw {
        statusCode: 400,
        message: `숫자가 아니거나 범위 [${min}, ${max}]를 벗어난 수입니다. (${targetName}: ${target})`,
      }
    }
  },
)

export const checkMatchedWithElements = curry(
  (elements, target, targetName) => {
    if (elements.include(target) === false) {
      throw {
        statusCode: 400,
        message: `배열의 원소들 ${elements}과 일치하지 않습니다. (${targetName}: ${target})`,
      }
    }
  },
)

export const check = (...args) => combine(args)
