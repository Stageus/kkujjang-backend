// @ts-check

import { Server } from 'socket.io'
import { Lobby } from '@/game/lobby'
import { getSession } from '@/utility/session'
import { errorMessage } from './error'
import { parseCookie } from '@/utility/cookie-parser'
import { GameRoom } from '@/game/gameRoom'

/**
 * @param {Server} io
 */
export const setupKkujjangWebSocket = (io) => {
  io.on('connection', async (socket) => {
    socket.join('LOBBY')

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

    Lobby.instance.enterUser(await fetchUserId())

    socket.on('load room list', () => {
      socket.emit('complete load room list', Lobby.instance.roomList)
    })

    socket.on('load room', async () => {
      socket.emit(
        'complete load room',
        Lobby.instance.getRoomDetailsByUserId(await fetchUserId()),
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

    socket.on(
      'join room',
      async (
        /**
         * @type {{
         *   roomId: string;
         *   password?: string;
         * }}
         */
        authorization,
      ) => {
        joinRoom(
          {
            ...authorization,
            userId: await fetchUserId(),
          },
          {
            onSuccess: (roomId, userId) => {
              io.to(roomId).emit('some user join room', userId)
              socket.leave('LOBBY')
              socket.join(roomId)
              socket.emit('complete join room', userId)
            },
            onError: (message) => emitError(message),
          },
        )
      },
    )

    socket.on('leave room', async () => {
      leaveRoom(await fetchUserId(), {
        onSuccess: (roomId, roomStatus) => {
          socket.leave(roomId)
          io.to(roomId).emit('some user leave room', roomStatus)
          socket.emit('complete leave room', roomStatus)
        },
        onRoomOwnerChange: (roomId, newRoomOwnerIndex) => {
          io.to(roomId).emit('change room owner', newRoomOwnerIndex)
        },
        onError: (message) => {
          emitError(message)
        },
      })
    })

    socket.on('disconnect', async () => {
      quit(await fetchUserId(), {
        notifyUserQuit: (roomId, userId) => {
          io.to(roomId).emit('some user leave room', userId)
        },
        onRoomOwnerChange: (roomId, newRoomOwnerIndex) => {
          io.to(roomId).emit('change room owner')
        },
        onError: (message) => {
          emitError(message)
        },
      })
      socket.emit('disconnected')
    })

    socket.on('switch ready state', async (state) => {
      const userId = await fetchUserId()
      switchReadyState(userId, state, {
        onSuccess: (roomId, index) => {
          io.to(roomId).emit('complete switch ready state', { index, state })
        },
        onError: (message) => {
          emitError(message)
        },
      })
    })

    socket.on('game start', async () => {
      await startGame(await fetchUserId(), {
        onSuccess: (roomId, gameStatus) => {
          io.to(roomId).emit('complete game start', gameStatus)
        },
        onError: (message) => {
          emitError(message)
        },
      })
    })

    socket.on('round start', async () => {
      startRound(await fetchUserId(), {
        onSuccess: (roomId, gameStatus) => {
          io.to(roomId).emit('complete round start', gameStatus)
        },
        onError: (message) => {
          emitError(message)
        },
      })
    })

    socket.on('turn start', async () => {
      startTurn(await fetchUserId(), {
        onSuccess: (roomId, gameStatus) => {
          io.to(roomId).emit('complete turn start', gameStatus)
        },
        onError: (message) => {
          socket.emit('error', message)
        },
        onTimerTick: (roomId, timeStatus) => {
          io.to(roomId).emit('timer', timeStatus)
        },
        onTurnEnd: (roomId) => {
          io.to(roomId).emit('turn end')
        },
        onRoundEnd: (roomId) => {
          io.to(roomId).emit('round end')
        },
        onGameEnd: (roomId, ranking) => {
          io.to(roomId).emit('game end', ranking)
        },
      })
    })

    socket.on('chat', async () => {})
  })
}

// TODO: 로직 파일 분리
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
 *   onSuccess: (roomId: string, roomStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const createRoom = (roomConfig, { onSuccess, onError }) => {
  const userId = roomConfig.roomOwnerUserId

  if (userId === null) {
    onError(errorMessage.unauthorized)
    return
  }

  if (!Lobby.instance.isUserAtLobby(userId)) {
    onError(errorMessage.invalidRequest)
    return
  }

  try {
    const roomId = Lobby.instance.createRoom({
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
 *   onSuccess: (roomId: string, roomStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const joinRoom = (
  { roomId, userId, password = null },
  { onSuccess, onError },
) => {
  try {
    Lobby.instance.tryJoiningRoom(roomId, userId, password)
    const gameRoom = Lobby.instance.getRoom(roomId)

    onSuccess(gameRoom.id, gameRoom.fullInfo)
  } catch (e) {
    onError(e.error)
  }
}

/**
 * @param {number} userId
 * @param {{
 *   onSuccess: (roomId: string, roomStatus: *) => void;
 *   onError: (message: string) => void;
 *   onRoomOwnerChange:(roomId: string, roomStatus: *) => void;
 * }} callbacks
 */
const leaveRoom = (userId, { onSuccess, onError, onRoomOwnerChange }) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null) {
    onError(errorMessage.invalidRequest)
    return
  }

  Lobby.instance.leaveRoom(userId, onRoomOwnerChange)

  onSuccess(
    gameRoom.id,
    gameRoom.state === 'destroyed' ? undefined : gameRoom.fullInfo,
  )
}

/**
 * @param {number} userId
 * @param {{
 *   notifyUserQuit: (roomId: string, userId: number) => void;
 *   onRoomOwnerChange: (roomId: string, roomStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const quit = (userId, { notifyUserQuit, onRoomOwnerChange, onError }) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null) {
    onError(errorMessage.invalidRequest)
    return
  }

  Lobby.instance.quitUser(userId, onRoomOwnerChange)
  notifyUserQuit(gameRoom.id, userId)
}

/**
 * @param {number} userId
 * @param {boolean} state
 * @param {{
 *   onSuccess: (roomId: string, gameStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const switchReadyState = (userId, state, { onSuccess, onError }) => {
  if (typeof state !== 'boolean') {
    onError(errorMessage.invalidRequest)
    return
  }

  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null || gameRoom.state !== 'preparing') {
    onError(errorMessage.invalidRequest)
    return
  }

  gameRoom.switchReadyState(userId, state)
  onSuccess(gameRoom.id, gameRoom.fullInfo)
}

/**
 * @param {number} userId
 * @param {{
 *   onSuccess: (roomId: string, gameStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const startGame = async (userId, { onSuccess, onError }) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null || gameRoom.state !== 'preparing') {
    onError(errorMessage.unableToStart)
    return
  }

  await gameRoom.startGame(userId)

  if (gameRoom.currentGameStatus === null) {
    onError(JSON.stringify(gameRoom.fullInfo))
    return
  }

  onSuccess(gameRoom.id, gameRoom.currentGameStatus)
}

/**
 * @param {number} userId
 * @param {{
 *   onSuccess: (
 *     roomId: string,
 *     gameStatus: *
 *   ) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const startRound = (userId, { onSuccess, onError }) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null || gameRoom.state !== 'playing') {
    onError(errorMessage.invalidRequest)
    return
  }

  gameRoom.startRound(userId)
  onSuccess(gameRoom.id, gameRoom.currentGameStatus)
}

/**
 * @param {number} userId
 * @param {{
 *   onTimerTick: (roomId: string, timeStatus: {
 *     roundTimeLeft: number;
 *     personalTimeLeft: number;
 *   }) => void;
 *   onTurnEnd: (roomId: string) => void;
 *   onRoundEnd: (roomId: string) => void;
 *   onGameEnd: (roomId: string, ranking: {
 *     userId: number;
 *     score: number;
 *   }[]) => void;
 *   onSuccess: (roomId: string, gameStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const startTurn = (
  userId,
  { onTurnEnd, onTimerTick, onRoundEnd, onGameEnd, onSuccess, onError },
) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null || gameRoom.state !== 'playing') {
    onError(errorMessage.invalidRequest)
    return
  }

  gameRoom.startTurn(userId, { onTimerTick, onTurnEnd, onRoundEnd, onGameEnd })
  onSuccess(gameRoom.id, gameRoom.currentGameStatus)
}
