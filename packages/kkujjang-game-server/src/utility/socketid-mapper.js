const socketIdMap = {}

/**
 * @param {Number} userId
 * @param {string} socketId
 * @returns {boolean}
 */
export const setSokcetIdByUserId = (userId, socketId) => {
  if (userId === null) {
    return false
  }
  socketIdMap[userId] = socketId
  return true
}

/**
 * @param {string} userId
 * @returns {string}
 */
export const getSocketIdByUserID = (userId) => socketIdMap[userId]
