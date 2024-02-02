import { redisClient } from '@database/redis'
import { configDotenv } from 'dotenv'
import * as uuid from 'uuid'

configDotenv()

export const getSession = async (id) => {
  if (!id) {
    return null
  }

  const session = await redisClient.hGetAll(`session-${id}`)

  if (!session || Object.keys(session).length === 0) {
    return null
  }

  return session
}

export const getSessionByPasswordChangeAuthId = async (
  passwordChangeAuthId,
) => {
  const session =
    (await redisClient.hGetAll(`passwordChange-${passwordChangeAuthId}`)) ?? {}

  return session
}

const getSessionByUserId = async (userId) => {
  if (!userId) {
    return null
  }

  const sessionId = (await redisClient.get(`session:${userId}`)) ?? null
  return await getSession(sessionId)
}

export const createSession = async (userData) => {
  const { userId, kakaoToken = '', authorityLevel } = userData
  const sessionId = uuid.v4()

  await redisClient.hSet(`session-${sessionId}`, {
    userId: userId,
    authorityLevel: authorityLevel,
    kakaoToken: kakaoToken,
  })
  await redisClient.set(`session:${userId}`, sessionId)

  await redisClient.expire(
    `session-${sessionId}`,
    process.env.SESSION_EXPIRES_IN,
  )
  await redisClient.expire(`session:${userId}`, process.env.SESSION_EXPIRES_IN)

  return sessionId
}

export const createPassWordChangeSession = async (userData) => {
  const { username, phone } = userData
  const sessionId = uuid.v4()

  await redisClient.hSet(`passwordChange-${sessionId}`, {
    username,
    phone,
  })

  await redisClient.expire(
    `passwordChange-${sessionId}`,
    process.env.PASSWORDCHANGE_SESSION_EXPIRES_IN,
  )

  return sessionId
}

export const destorySession = async (sessionId) => {
  const { userId } = await getSession(sessionId)

  await redisClient.del([`session-${sessionId}`])
  await redisClient.del([`session:${userId}`])
}

export const destoryPasswordChangeSession = async (passwordChangeAuthId) => {
  await redisClient.del([`passwordChange-${passwordChangeAuthId}`])
}

export const isSignedIn = async (userId) => {
  const { userId: userIdInSession = null } =
    (await getSessionByUserId(userId)) ?? {}

  console.log(`userId: ${userId}, userIdInSession: ${userIdInSession}`)

  return userIdInSession !== null && userId === userIdInSession
}
