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

  let err = []
  funcs.array.forEach((func) => {
    const check = f(target, func)
    if (check) err.push(check)
  })

  if (err.length) {
    throw {
      statusCode: 400,
      message: err,
    }
  }
}

export const checkExist = curry((target) => {
  return target != '' && target != null && target != undefined
})

export const checkLength = curry((min, max, target) => {
  return min <= target.length && target.length <= max
})

export const checkStd = curry((std, target) => {
  return RegExp(std).test(target)
})

export const checkSame = curry((sameTarget, msg, target) => {
  if (target != sameTarget) {
    throw JSON.stringify({
      statusCode: 400,
      message: msg,
    })
  }
  return true
})

export const check = (...as) => combine((as, f) => f(as), as)
