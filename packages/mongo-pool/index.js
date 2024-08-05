import { configDotenv } from 'dotenv'
import mongoose, { Model, Schema } from 'mongoose'
import { chatSchema } from './model/chat.js'
import {
  userEnterSchema,
  userLeaveSchema,
  createRoomSchema,
  expireRoomSchema,
  sayWordSchema,
  gameStartSchema,
  gameEndSchema,
  roomSchema,
} from './model/room.js'

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

console.log(
  `Created MongoDB Pool to mongodb://${dbConfig.user}:[PASSWD]@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}.`,
)

/**
 * @param {string} modelName
 * @param {Schema} schema
 * @param {string} collectionName
 * @returns {Model}
 */
export const useMongoModel = (modelName, schema, collectionName) => {
  const connection = mongoPool.useDb(dbConfig.database)
  return connection.model(modelName, schema, collectionName)
}

/**
 * @param {string} modelName
 */
export const getModel = (modelName) => {
  console.log(`getting model ${modelName}`)
  switch (modelName) {
    case 'chat':
      return chatSchema

    case 'userEnter':
      return userEnterSchema

    case 'userLeave':
      return userLeaveSchema

    case 'createRoom':
      return createRoomSchema

    case 'expireRoom':
      return expireRoomSchema

    case 'sayWord':
      return sayWordSchema

    case 'gameStart':
      return gameStartSchema

    case 'gameEnd':
      return gameEndSchema

    case 'room':
      return roomSchema
  }
}
