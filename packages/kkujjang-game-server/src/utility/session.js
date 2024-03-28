import { authSession } from 'kkujjang-session'

const sessionIdToUserId = {}

export const isUserIdExist = {}

export const setSocketSession = async (socket) => {
  /**
   * @type {string}
   */
  const sessionId = `${socket.handshake.headers.sessionid}`

  const userId = (await authSession.get(sessionId))?.userId
  if (userId === undefined) return false

  sessionIdToUserId[sessionId] = userId
  return true
}

export const getUserIdBySessionId = (socket) => {
  /**
   * @type {string}
   */
  const sessionId = `${socket.handshake.headers.sessionid}`

  const userId = sessionIdToUserId[sessionId]

  if (userId === undefined) {
    return null
  }

  return Number(userId)
}
