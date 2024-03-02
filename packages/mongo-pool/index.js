import { configDotenv } from 'dotenv'
import mongoose, { Model, Schema } from 'mongoose'

configDotenv()

const dbConfig = {
  host: process.env.MONGODB_HOST,
  port: process.env.MONGODB_PORT,
  user: process.env.MONGODB_USER,
  password: process.env.MONGODB_PASSWORD,
  database:
    process.env.NODE_ENV === 'production'
      ? process.env.MONGODB_NAME
      : process.env.MONGODB_TEST_NAME,
}

const mongoPool = mongoose.createConnection(
  `mongodb://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?authSource=admin`,
  {
    maxPoolSize: 10,
  },
)

mongoPool.asPromise().catch((e) => console.error(e))

console.log(
  `Created MongoDB Pool to mongodb://${dbConfig.user}:[PASSWD]@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}.`,
)

/**
 * @param {string} modelName
 * @param {Schema} schema
 * @returns {Model}
 */
export const useMongoModel = (modelName, schema) => {
  return mongoPool.useDb(dbConfig.database).model(modelName, schema)
}
