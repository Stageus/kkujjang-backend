import { Socket } from 'socket.io'
import { authSession } from 'kkujjang-session'

const sessionIdToUserId = {}

/**
 * @param {Socket} socket
 * @returns {Promise<boolean>}
 */
export const setSocketSession = async (socket) => {
  const sessionId = `${socket.handshake.headers.sessionid}`

  const userId = (await authSession.get(sessionId))?.userId
  if (userId === undefined) return false

  sessionIdToUserId[sessionId] = userId
  return true
}

/**
 * @param {Socket} socket
 * @returns {Number | null}
 */
export const getUserIdBySessionId = (socket) => {
  const sessionId = `${socket.handshake.headers.sessionid}`

  const userId = sessionIdToUserId[sessionId]

  if (userId === undefined) {
    return null
  }

  return Number(userId)
}

/**
 * @param {Socket} socket
 * @returns {void}
 */
export const destroySocketSession = (socket) => {
  const sessionId = `${socket.handshake.headers.sessionid}`
  const userId = getUserIdBySessionId(socket)
  if (userId === null) {
    return
  }
  delete sessionIdToUserId[sessionId]
}
