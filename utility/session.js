import { redisClient } from '@database/redis'

export const getSession = async (id) => {
  const session = await redisClient.hGetAll(id)

  if (session || Object.keys(session).length == 0) {
    throw {
      statusCode: 401,
      message: `세션이 만료되었거나 세션 ID가 유효하지 않습니다: ${id}`,
    }
  }

  return session
}
