import { configDotenv } from 'dotenv'
import mongoose from 'mongoose'

configDotenv()

const dbConfig = {
  host: process.env.DDB_HOST,
  port: process.env.DDB_PORT,
  user: process.env.DDB_USER,
  password: process.env.DDB_PASSWORD,
  database:
    process.env.NODE_ENV === 'production'
      ? process.env.DDB_NAME
      : process.env.DDB_TEST_NAME,
}

const mongoPool = mongoose.createConnection(
  `mongodb://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?authSource=admin`,
  {
    maxPoolSize: 10,
  },
)

export const useMongoModel = (modelName, schema) => {
  return mongoPool.useDb(dbConfig.database).model(modelName, schema)
}

console.log(
  `Created MongoDB Pool to mongodb://${dbConfig.user}:[PASSWD]@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}.`,
)
