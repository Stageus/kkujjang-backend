import { chatSchema } from '#model/chat'
import { useMongoModel } from 'mongo-pool'

/**
 * @param {number} userId
 * @param {string} message
 */
export const logChat = async (userId, message) => {
  await useMongoModel('chat', chatSchema).insertMany([
    {
      userId,
      message,
    },
  ])
}

/**
 * @param {{
 *   userId: number;
 *   dateStart: string;
 *   dateEnd: string;
 * }} params
 * @returns {{}}
 */
export const loadChats = async ({ userId, dateStart, dateEnd }) => {
  return await useMongoModel('chat', chatSchema).find({
    userId,
    created_at: {
      $gte: dateStart,
      $lte: dateEnd,
    },
  })
}
