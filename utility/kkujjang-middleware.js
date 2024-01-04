import { getSession } from '@utility/session'
import { configDotenv } from 'dotenv'

configDotenv()

export const requireSignin = async (req, res, next) => {
  const session = await getSession(req.cookies.sessionId)

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
  const session = await getSession(req.cookies.sessionId)

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
