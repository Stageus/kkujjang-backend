const socketIdMap = {}

export const setSokcetIdByUserId = (userId, socketId) => {
  if (userId === null) {
    return null
  }
  socketIdMap[userId] = socketId
}

export const getSocketIdByUserID = (userId) => socketIdMap[userId]
