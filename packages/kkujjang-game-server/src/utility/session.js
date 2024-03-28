import { authSession } from 'kkujjang-session'

const sessionIdToUserId = {}

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
  const sessionId = `${socket.handshake.headers.sessionid}`

  const userId = sessionIdToUserId[sessionId]

  if (userId === undefined) {
    return null
  }

  return Number(userId)
}

export const destroySocketSession = (socket) => {
  const sessionId = `${socket.handshake.headers.sessionid}`
  const userId = getUserIdBySessionId(socket)
  if (userId === null) {
    return
  }
  delete sessionIdToUserId[sessionId]
}
