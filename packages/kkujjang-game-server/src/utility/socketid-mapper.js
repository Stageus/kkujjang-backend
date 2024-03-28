const socketIdMap = {}

export const setSokcetIdByUserId = (userId, socketId) => {
  socketIdMap[userId] = socketId
}

export const getSocketIdByUserID = (userId) => socketIdMap[userId]
