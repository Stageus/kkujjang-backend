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
  const funcs = iter[Symbol.iterator]()

  const target = funcs.next().value
  const targetType = funcs.next().value

  const messages = Array.from(funcs).reduce((errors, func) => {
    const result = func(target)
    result !== true && errors.push(result)
    return errors
  }, [])

  if (messages.length != 0) {
    throw JSON.stringify({
      statusCode: 400,
      targetString: targetType,
      messages,
    })
  }
}

export const checkExist = curry((target) => {
  if (target != '' && target != null && target != undefined) {
    return true
  }
  return `checkExist: 값이 존재하지 않습니다.`
})

export const checkLength = curry((min, max, target) => {
  if (min <= target.length && target.length <= max) {
    return true
  }
  if (target.length < min) {
    return `checkLength: 길이가 너무 짧습니다.`
  }
  if (max < target.length) {
    return `checkLength: 길이가 너무 깁니다.`
  }
})

export const checkRegExp = curry((std, target) => {
  if (RegExp(std).test(target)) {
    return true
  }
  return `checkRegExp: 정규표현식과 일치하지 않습니다.`
})

export const checkSame = curry((sameTarget, target) => {
  if (target == sameTarget) {
    return true
  }
  return `checkSame: 비교 대상 문자열과 동일하지 않은 문자열입니다.`
})

export const check = (...args) => combine(args)
