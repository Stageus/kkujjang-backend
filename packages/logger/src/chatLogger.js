import { useMongoModel } from 'mongo-pool'
import { configDotenv } from 'dotenv'
import { getModel } from 'mongo-pool'

configDotenv()

/**
 * @param {number} userId
 * @param {string} roomId
 * @param {string} message
 */
export const logChat = async (userId, roomId, message) => {
  console.log('inserting chat...')

  const insertResult = await useMongoModel(
    'chat',
    getModel('chat'),
    'chat',
  ).insertMany([
    {
      userId,
      roomId,
      message,
    },
  ])

  console.log(`inserted: ${insertResult}`)
}

/**
 * @param {{
 *   userId: number;
 *   dateStart: string;
 *   dateEnd: string;
 * }} params
 * @returns {{
 *   _id: string;
 *   userId: number;
 *   message: string;
 *   __v: number;
 *   updatedAt: string;
 *   createdAt: string;
 * }[]}
 */
export const loadChats = async ({ userId, roomId, dateStart, dateEnd }) => {
  const filter = {}

  userId && (filter['userId'] = userId)
  ;(dateStart || dateEnd) && (filter['createdAt'] = {})

  dateStart && (filter['createdAt']['$gte'] = dateStart)
  dateEnd && (filter['createdAt']['$lte'] = dateEnd)

  roomId && (filter['roomId'] = roomId)

  console.log(JSON.stringify(filter))

  return await useMongoModel('chat', getModel('chat'), 'chat')
    .find(filter)
    .select('-_id -updatedAt -__v')
    .exec()
}
