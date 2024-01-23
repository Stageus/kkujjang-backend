// @ts-check

import { Server } from 'socket.io'
import { GameManager } from '@/game/core'
import { getSession } from '@/utility/session'
import { errorMessage } from './error'
import { parseCookie } from '@/utility/cookie-parser'

/**
 * @param {Server} io
 */
export const setupKkujjangWebSocket = (io) => {
  io.on('connection', async (socket) => {
    /**
     * @returns {Promise<number>}
     */
    const fetchUserId = async () => {
      const { sessionId } = parseCookie(socket.handshake.headers.cookie)
      if (!sessionId) return null

      const userId = (await getSession(sessionId))?.userId
      if (userId === undefined) return null

      return Number(userId)
    }

    /**
     * @param {string} message
     */
    const emitError = (message) => {
      socket.emit('error', message)
    }

    GameManager.instance.enterUser(await fetchUserId())

    socket.on('load room list', () => {
      socket.emit('complete load room list', GameManager.instance.roomList)
    })

    socket.on('load room', async () => {
      socket.emit(
        'complete load room',
        GameManager.instance.getRoomDetailsByUserId(await fetchUserId()),
      )
    })

    socket.on('create room', async (roomConfig) => {
      createRoom(
        {
          roomOwnerUserId: await fetchUserId(),
          ...roomConfig,
        },
        {
          onSuccess: (roomId) => {
            socket.join(roomId)
            socket.emit('complete create room')
          },
          onError: (message) => emitError(message),
        },
      )
    })

    socket.on('join room', async (authorization) => {
      joinRoom(
        {
          ...authorization,
          userId: await fetchUserId(),
        },
        {
          onSuccess: (roomId, userId) => {
            io.to(roomId).emit('some user join room', userId)
            socket.join(roomId)
            socket.emit('complete join room', userId)
          },
          onError: (message) => emitError(message),
        },
      )
    })

    socket.on('leave room', async () => {
      leaveRoom(
        await fetchUserId(),
        (roomId) => {
          socket.leave(roomId)
          io.to(roomId).emit('some user leave room')
          socket.emit('complete leave room')
        },
        (roomId, newRoomOwnerIndex) => {
          io.to(roomId).emit('change room owner')
        },
      )
    })

    socket.on('disconnect', async () => {
      quit(
        await fetchUserId(),
        (roomId, userId) => {
          io.to(roomId).emit('some user leave room', userId)
        },
        (roomId, newRoomOwnerIndex) => {
          io.to(roomId).emit('change room owner')
        },
      )
      socket.emit('disconnected')
    })
  })
}

/**
 * @param {{
 *   roomOwnerUserId: number;
 *   title: string;
 *   password: string;
 *   maxUserCount: number;
 *   maxRound: number;
 *   roundTimeLimit: number;
 * }} roomConfig
 * @param {{
 *   onSuccess: (roomId: string) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const createRoom = (roomConfig, { onSuccess, onError }) => {
  const userId = roomConfig.roomOwnerUserId

  if (userId === null) {
    onError(errorMessage.unauthorized)
  }

  if (!GameManager.instance.isUserAtLobby(userId)) {
    onError(errorMessage.invalidRequest)
  }

  try {
    const roomId = GameManager.instance.createRoom({
      roomOwnerUserId: userId,
      ...roomConfig,
    })

    onSuccess(roomId)
  } catch (e) {
    onError(errorMessage.invalidRequest)
  }
}

/**
 * @param {{
 *   roomId: string;
 *   userId: number;
 *   password?: string;
 * }} authorization
 * @param {{
 *   onSuccess: (roomId: string, userid: number) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const joinRoom = (
  { roomId, userId, password = null },
  { onSuccess, onError },
) => {
  try {
    GameManager.instance.tryJoiningRoom(roomId, userId, password)
    onSuccess(roomId, userId)
  } catch (e) {
    onError(e.error)
  }
}

/**
 *
 * @param {number} userId
 * @param {(roomId: string) => void} onSuccess
 * @param {(roomId: string) => void} onRoomOwnerChange
 */
const leaveRoom = (userId, onSuccess, onRoomOwnerChange) => {
  const roomId = GameManager.instance.leaveRoom(userId, onRoomOwnerChange)

  if (roomId !== null) {
    onSuccess(roomId)
  }
}

/**
 * @param {number} userId
 * @param {(roomId: string, userId: number) => void} notifyUserQuit
 * @param {(roomId: string, newRoomOwnerIndex: number) => void} onRoomOwnerChange
 */
const quit = (userId, notifyUserQuit, onRoomOwnerChange) => {
  const roomId = GameManager.instance.quitUser(userId, onRoomOwnerChange)

  if (roomId !== null) {
    notifyUserQuit(roomId, userId)
  }
}
