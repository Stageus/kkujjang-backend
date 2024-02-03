import { configDotenv } from 'dotenv'
import * as redis from 'redis'

configDotenv()

const dbConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  database:
    process.env.NODE_ENV === 'production'
      ? process.env.REDIS_DB
      : process.env.REDIS_TEST_DB,
}

export const redisClient = redis.createClient({
  url: `redis://:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
})

redisClient.on('error', (error) => {
  console.error(error)
})

// 코드 최상단에서 await을 사용하기 위해 async 익명 함수를 만들어 바로 호출하는 방식
;(async () => {
  await redisClient.connect()
})()

console.log(`Created Redis Connection to ${dbConfig.host}:${dbConfig.port}`)
