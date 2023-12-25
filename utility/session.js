import { redisClient } from '@database/redis'
import { configDotenv } from 'dotenv'
import * as uuid from 'uuid'

configDotenv()

export const getSession = async (id) => {
  const session = await redisClient.hGetAll(`session-${id}`)

  if (!session || Object.keys(session).length == 0) {
    throw {
      statusCode: 401,
      message: `세션이 만료되었거나 세션 ID가 유효하지 않습니다. ${id}: ${JSON.stringify(
        session,
      )}`,
    }
  }

  return session
}

export const createSession = async (userData) => {
  const { userId, kakaoToken, authorityLevel } = userData
  const sessionId = uuid.v4()

  await redisClient.hSet(`session-${sessionId}`, {
    userId: userId,
    authorityLevel: authorityLevel,
    kakaoToken: kakaoToken,
  })

  await redisClient.expire(
    `session-${sessionId}`,
    process.env.SESSION_EXPIRES_IN,
  )

  return sessionId
}

export const destorySession = async (id) => {
  await redisClient.del([`session-${id}`])
}
