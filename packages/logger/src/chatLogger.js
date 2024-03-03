import { useMongoModel } from 'mongo-pool'
import { configDotenv } from 'dotenv'
import { getModel } from 'mongo-pool'

configDotenv()

/**
 * @param {number} userId
 * @param {string} message
 */
export const logChat = async (userId, message) => {
  console.log('inserting chat...')

  const insertResult = await useMongoModel(
    'chat',
    getModel('chat'),
    'chat',
  ).insertMany([
    {
      userId,
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
export const loadChats = async ({ userId, dateStart, dateEnd }) => {
  const filter = {}

  userId && (filter['userId'] = userId)
  ;(dateStart || dateEnd) && (filter['createdAt'] = {})

  dateStart && (filter['createdAt']['$gte'] = dateStart)
  dateEnd && (filter['createdAt']['$lte'] = dateEnd)

  console.log(JSON.stringify(filter))

  return await useMongoModel('chat', getModel('chat'), 'chat')
    .find(filter)
    .exec()
}
