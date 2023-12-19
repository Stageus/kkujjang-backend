import { json } from 'express'

// 주석의 내용
const curry =
  (f) =>
  (...as) => {
    if (f.length <= as.length) {
      return f(...as)
    }
    return (...bs) => curry(f)(...as, ...bs)
  }
// 주석의 내용
const combine = (f, iter) => {
  const funcs = iter[Symbol.iterator]()

  const target = funcs.next().value
  const msg = funcs.next().value

  const reason = Array.from(funcs).reduce((errors, func) => {
    const result = func(target)
    result !== true && errors.push(result)
    return errors
  }, [])

  if (reason.length != 0) {
    throw JSON.stringify({
      statusCode: 400,
      where: msg + ` 유효성 검사 중`,
      reason: reason,
    })
  }
}

export const checkExist = curry((target) => {
  if (target != '' && target != null && target != undefined) {
    return true
  }
  return `checkExist에서 유효성 검사가 실패했습니다.`
})

export const checkLength = curry((min, max, target) => {
  if (min <= target.length && target.length <= max) {
    return true
  }
  return `checkLength에서 유효성 검사가 실패했습니다.`
})

export const checkRegExp = curry((std, target) => {
  if (RegExp(std).test(target)) {
    return true
  }
  return `checkRegExp에서 유효성 검사가 실패했습니다.`
})

export const checkSame = curry((sameTarget, target) => {
  if (target == sameTarget) {
    return true
  }
  return `checkSame에서 유효성 검사가 실패했습니다.`
})

export const check = (...as) => combine((as, f) => f(as), as)
