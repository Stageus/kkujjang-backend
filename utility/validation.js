// curry는 inputValues의 개수에 따라
// 다시 한번 inputValues를 요구하는 함수를 return해줄지

import { json } from 'express'

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
  const msg = funcs.next().value

  const reason = Array.from(funcs).reduce((errors, func) => {
    const result = func(target)
    result !== true && errors.push(result)
    return errors
  }, [])

  if (reason.length != 0) {
    throw {
      statusCode: 400,
      where: msg,
      reason: reason,
    }
  }
}

export const checkExist = curry((target) => {
  if (target != '' && target != null && target != undefined) {
    return true
  }
  return `checkExist에서 실패했습니다.`
})

export const checkLength = curry((min, max, target) => {
  if (min <= target.length && target.length <= max) {
    return true
  }
  return `checkLength에서 실패했습니다.`
})

export const checkRegExp = curry((std, target) => {
  if (RegExp(std).test(target)) {
    return true
  }
  return `checkRegExp에서 실패했습니다.`
})

export const checkSame = curry((sameTarget, target) => {
  if (target == sameTarget) {
    return true
  }
  return `checkSame에서 실패했습니다.`
})

export const check = (...args) => combine(args)
