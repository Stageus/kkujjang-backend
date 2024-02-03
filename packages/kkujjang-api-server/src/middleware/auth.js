import { authSession, smsAuthSession } from 'kkujjang-session'
import { configDotenv } from 'dotenv'

configDotenv()

export const allowGuestOnly = async (req, res, next) => {
  if (req.cookies.sessionId) {
    throw {
      statusCode: 400,
      message: '이미 로그인 상태입니다.',
    }
  }

  next()
}

export const requireSignin = async (req, res, next) => {
  const session = await authSession.getSession(req.cookies.sessionId)

  if (!session) {
    throw {
      statusCode: 401,
      message: '로그인이 필요합니다.',
    }
  }

  res.locals.session = session

  next()
}

export const requireAdminAuthority = async (req, res, next) => {
  const session = await authSession.getSession(req.cookies.sessionId)

  if (
    !session ||
    Number(session.authorityLevel) < Number(process.env.ADMIN_AUTHORITY)
  ) {
    throw {
      statusCode: 401,
      message: '권한이 없습니다.',
    }
  }

  res.locals.session = session

  next()
}

export const requireSmsAuth = async (req, res, next) => {
  const { smsAuthId } = req.cookies
  const { phone } = req.body

  const smsAuth = await smsAuthSession.get(smsAuthId)
  console.log(JSON.stringify(smsAuthSession))

  if (
    !smsAuthId ||
    smsAuth.phoneNumber !== phone ||
    smsAuth.fulfilled !== 'true'
  ) {
    throw {
      statusCode: 400,
      message: '휴대폰 인증이 되어있지 않습니다.',
    }
  }

  await smsAuthSession.destroy(smsAuthId)
  res.setHeader(
    'Set-Cookie',
    `smsAuthId=none; Path=/; Secure; HttpOnly; Max-Age=0`,
  )

  next()
}
