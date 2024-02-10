// @ts-nocheck

import { redisClient } from 'redis-cli'
import { configDotenv } from 'dotenv'
import * as uuid from 'uuid'

configDotenv()

/**
 * @param {string} id session ID
 * @returns {Promise<{
 *   userId: string;
 *   authorityLevel: string;
 *   kakaoToken?: string;
 * } | null>}
 */
export const get = async (id) => {
  if (!id) {
    return null
  }

  const session = await redisClient.hGetAll(`session-${id}`)

  if (!session || Object.keys(session).length === 0) {
    return null
  }

  return session
}

/**
 * @param {number} userId
 */
const getByUserId = async (userId) => {
  if (!userId) {
    return null
  }

  const sessionId = (await redisClient.get(`session:${userId}`)) ?? null
  return await get(sessionId)
}

/**
 * @param {{
 *   userId: number;
 *   authorityLevel: number;
 *   kakaoToken?: string;
 * }} userData
 * @returns
 */
export const create = async (userData) => {
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

export const destroy = async (sessionId) => {
  const { userId } = await get(sessionId)

  await redisClient.del([`session-${sessionId}`])
  await redisClient.del([`session:${userId}`])
}

export const destoryPasswordChangeSession = async (passwordChangeAuthId) => {
  await redisClient.del([`passwordChange-${passwordChangeAuthId}`])
}

export const isSignedIn = async (userId) => {
  const { userId: userIdInSession = null } = (await getByUserId(userId)) ?? {}

  console.log(`userId: ${userId}, userIdInSession: ${userIdInSession}`)

  return userIdInSession !== null && Number(userId) === Number(userIdInSession)
}
