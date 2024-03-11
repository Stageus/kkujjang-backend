import { useMongoModel } from 'mongo-pool'
import { configDotenv } from 'dotenv'
import { getModel } from 'mongo-pool'

configDotenv()

/**
 * @param {string} type
 * @param {*} log
 */
export const logRoom = async (type, log) => {
  console.log(`inserting room : ${type}...`)

  const logWithType = {
    type,
    ...log,
  }

  const insertedResult = await useMongoModel(
    'room',
    getModel(type),
    'room',
  ).create(logWithType)

  console.log(`inserted: ${insertedResult}`)
}

/**
 * @param {{
 *   roomId: string;
 * }} params
 * @returns {{*}}
 */
export const loadRoom = async (roomId) => {
  const filter = {}

  roomId && (filter['roomId'] = roomId)

  console.log(JSON.stringify(filter))

  return await useMongoModel('room', getModel('room'), 'room')
    .find(filter)
    .select('-_id -roomId -updatedAt -__v')
    .lean()
    .exec()
}
