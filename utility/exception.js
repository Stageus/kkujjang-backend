const curry =
  (f) =>
  (...as) => {
    if (f.length <= as.length) {
      return f(...as);
    }
    return (...bs) => curry(f)(...as, ...bs);
  };

const combine = (f, iter) => {
  const funcs = iter[Symbol.iterator]();

  const target = funcs.next().value;
  const msg = funcs.next().value;

  for (const func of funcs) {
    if (f(target, func) == false) {
      throw JSON.stringify({
        errorCode: 400,
        message: msg,
      });
    }
  }

  return true;
};

const chkExist = curry((target) => {
  return target != '' && target != null && target != undefined;
});

const chkLength = curry((min, max, target) => {
  return min <= target.length && target.length <= max;
});

const chkStd = curry((std, target) => {
  return RegExp(std).test(target);
});

const chkSame = curry((sameTarget, msg, target) => {
  if (target != sameTarget) throw msg;
  return true;
});

const check = (...as) => combine((as, f) => f(as), as);

export { check, chkExist, chkLength, chkStd, chkSame };
