import { redisClient } from '@database/redis'

export const getRanking = async () => {
  const rankingData = await redisClient.get(`ranking`)
  return rankingData
}

export const updateRanking = async (rankingData) => {
  await redisClient.set(`ranking`, rankingData)
}
