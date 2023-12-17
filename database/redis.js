import { configDotenv } from 'dotenv'
import * as redis from 'redis'

configDotenv()

const dbConfig = {
  host: process.env.CACHE_HOST,
  port: process.env.CACHE_PORT,
  password: process.env.CACHE_PASSWORD,
  database: process.env.CACHE_DB,
}

const redisClient = redis.createClient({
  url: `redis://:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
})

;(async () => {
  await redisClient.connect()
})()

console.log(`Created Redis Connection to ${dbConfig.host}:${dbConfig.port}`)

export const getFromRedis = async (key) => {
  const result = await redisClient.get(key)

  return result
}

export const setToRedis = async (key, value) => {
  await redisClient.set(key, value)
}
