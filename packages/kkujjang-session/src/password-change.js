import { configDotenv } from 'dotenv'
import { redisClient } from 'redis-cli'
import * as uuid from 'uuid'

configDotenv()

export const get = async (passwordChangeAuthId) => {
  const session =
    (await redisClient.hGetAll(`passwordChange-${passwordChangeAuthId}`)) ?? {}

  return session
}

export const create = async (userData) => {
  const { username, phone } = userData
  const sessionId = uuid.v4()

  console.log(`pw change session: ${sessionId}`)

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

export const destroy = async (passwordChangeAuthId) => {
  await redisClient.del([`passwordChange-${passwordChangeAuthId}`])
}
