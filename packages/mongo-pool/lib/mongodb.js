// @ts-check

import { configDotenv } from 'dotenv'
import mongoose from 'mongoose'

configDotenv()

const config = {
  host: process.env.MONGODB_HOST,
  port: Number(process.env.MONGODB_PORT),
  user: process.env.MONGODB_USER,
  password: process.env.MONGODB_PASSWORD,
  database:
    process.env.NODE_ENV === 'production'
      ? process.env.MONGODB_NAME
      : process.env.MONGODB_TEST_NAME,
}

const connectionString = `mongodb://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}?authSource=admin`

export const mongoPool = mongoose.createConnection(connectionString, {
  maxPoolSize: 10,
})

console.log(`Created MongoDB Pool to ${connectionString}`)

export default mongoPool
