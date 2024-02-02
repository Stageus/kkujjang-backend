import { configDotenv } from 'dotenv'
import * as redis from 'redis'

configDotenv()

const dbConfig = {
  host: process.env.CACHE_HOST,
  port: process.env.CACHE_PORT,
  password: process.env.CACHE_PASSWORD,
  database:
    process.env.NODE_ENV === 'production'
      ? process.env.CACHE_DB
      : process.env.CACHE_TEST_DB,
}

export const redisClient = redis.createClient({
  url: `redis://:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
})

// 코드 최상단에서 await을 사용하기 위해 async 익명 함수를 만들어 바로 호출하는 방식
;(async () => {
  await redisClient.connect()
})()

console.log(`Created Redis Connection to ${dbConfig.host}:${dbConfig.port}`)
