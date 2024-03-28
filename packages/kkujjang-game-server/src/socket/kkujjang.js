// @ts-check

import { Server, Socket } from 'socket.io'
import { authSession } from 'kkujjang-session'
import { errorMessage } from '#utility/error'
import { GameRoom } from '#game/gameRoom'
import { Lobby } from '#game/lobby'
import { setSokcetIdByUserId } from '#utility/socketid-mapper'
import { chatLogger } from 'logger'
import { roomLogger } from 'logger'

/**
 * @type {{
 *   [userId: string]: {
 *     timeout: NodeJS.Timeout;
 *     state: 'game' | 'round' | 'turn'
 *   }
 * }}
 */
const socketTimeouts = {}

/**
 * @param {Server} io
 */
export const setupKkujjangWebSocket = (io) => {
  io.on('connection', async (socket) => {
    if (!(await isUserSignedInApiServer(socket))) {
      socket.emit('error', errorMessage.unauthorized)
      return
    }

    if (await isUserOnline(socket)) {
      socket.emit('error', errorMessage.isAlreadyLogin)
      return
    }

    setSokcetIdByUserId(await fetchUserId(socket), socket.id)

    socket.join('LOBBY')
    Lobby.instance.enterUser(await fetchUserId(socket))

    socket.on('load room list', () => {
      socket.emit('complete load room list', Lobby.instance.roomList)
    })

    socket.on('load room', async () => {
      socket.emit(
        'complete load room',
        Lobby.instance.getRoomDetailsByUserId(await fetchUserId(socket)),
      )
    })

    socket.on('create room', async (roomConfig) => {
      createRoom(
        {
          roomOwnerUserId: await fetchUserId(socket),
          ...roomConfig,
        },
        {
          onComplete: async (roomId) => {
            socket.leave('LOBBY')
            socket.join(roomId)
            socket.emit('complete create room')
            io.to('LOBBY').emit(
              'load new room',
              Lobby.instance.getRoom(roomId).info,
            )
            const userId = await fetchUserId(socket)
            await roomLogger.logRoom('createRoom', { roomId })
            await roomLogger.logRoom('userEnter', { roomId, userId })
          },
          onError: (message) => emitError(socket, message),
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
            userId: await fetchUserId(socket),
          },
          {
            onComplete: async (roomId, userId) => {
              io.to(roomId).emit('some user join room', userId)
              socket.leave('LOBBY')
              socket.join(roomId)
              const gameRoom = Lobby.instance.getRoom(roomId)
              io.to('LOBBY').emit('update room member count', {
                roomId,
                currentUserCount: gameRoom.info.currentUserCount,
              })
              socket.emit('complete join room')
              await roomLogger.logRoom('userEnter', { roomId, userId })
            },
            onError: (message) => emitError(socket, message),
          },
        )
      },
    )

    socket.on('leave room', async () => {
      leaveRoom(await fetchUserId(socket), {
        onComplete: async (roomId, roomStatus) => {
          socket.leave(roomId)
          socket.join('LOBBY')
          if (roomStatus === undefined) {
            io.to('LOBBY').emit('destroy room', {
              roomId,
            })
            await roomLogger.logRoom('expireRoom', { roomId })
          } else {
            io.to('LOBBY').emit('update room member count', {
              roomId,
              currentUserCount: roomStatus.currentUserCount,
            })
            io.to(roomId).emit('some user leave room', roomStatus)
          }
          socket.emit('complete leave room')
          const userId = await fetchUserId(socket)
          await roomLogger.logRoom('userLeave', { roomId, userId })
        },
        onRoomOwnerChange: (roomId, newRoomOwnerIndex) => {
          io.to(roomId).emit('change room owner', newRoomOwnerIndex)
        },
        onError: (message) => {
          emitError(socket, message)
        },
      })
    })

    socket.on('disconnect', () => onDisconnect(io, socket))

    socket.on('switch ready state', async (state) => {
      const userId = await fetchUserId(socket)
      switchReadyState(userId, state, {
        onComplete: (roomId, index) => {
          io.to(roomId).emit('complete switch ready state', { index, state })
        },
        onError: (message) => {
          emitError(socket, message)
        },
      })
    })

    socket.on('change room config', async (roomConfig) => {
      const userId = await fetchUserId(socket)

      changeRoomConfig(userId, roomConfig, {
        onComplete: (roomId, roomInfo) => {
          io.to(roomId).emit('complete change room config', roomInfo)
          io.to('LOBBY').emit('update room config', roomInfo)
        },
        onError: (message) => {
          emitError(socket, message)
        },
      })
    })

    socket.on('game start', async () => {
      const userId = await fetchUserId(socket)
      await startGame(userId, {
        onComplete: async (roomId, gameStatus) => {
          io.to(roomId).emit('complete game start', gameStatus)
          startSocketTimer(io, socket, userId, 'round')

          const userList = gameStatus.usersSequence.map(
            (usersSequence) => usersSequence.userId,
          )
          await roomLogger.logRoom('gameStart', { roomId, userList })
        },
        onError: (message) => {
          emitError(socket, message)
        },
        onTimerTick: (roomId, timeStatus) => {
          io.to(roomId).emit('timer', timeStatus)
        },
        onTurnEnd: (roomId) => {
          io.to(roomId).emit('turn end')
        },
        onRoundEnd: (roomId, roundResult) => {
          io.to(roomId).emit('round end', roundResult)
        },
        onGameEnd: async (roomId, ranking) => {
          io.to(roomId).emit('game end', ranking)
          const userList = ranking.map((ranking) => ranking.userId)
          const gameRoom = Lobby.instance.getRoomByUserId(userId)
          gameRoom.resetReadyState()
          await roomLogger.logRoom('gameEnd', { roomId, userList, ranking })
        },
      })
    })

    socket.on('round start', async () => {
      const userId = await fetchUserId(socket)
      startRound(userId, {
        onComplete: (roomId, gameStatus) => {
          stopSocketTimer(userId, 'round')
          io.to(roomId).emit('complete round start', gameStatus)
          startSocketTimer(io, socket, gameStatus.currentTurnUserId, 'turn')
        },
        onError: (message) => {
          emitError(socket, message)
        },
      })
    })

    socket.on('turn start', async () => {
      const userId = await fetchUserId(socket)
      startTurn(userId, {
        onComplete: (roomId, gameStatus) => {
          stopSocketTimer(userId, 'turn')
          io.to(roomId).emit('complete turn start', gameStatus)
        },
        onError: (message) => {
          socket.emit('error', message)
        },
      })
    })

    socket.on('chat', async (message) => {
      const userId = await fetchUserId(socket)
      await chat(userId, message, {
        onOrdinaryChat: async (roomId) => {
          io.to(roomId).emit('chat', { userId, message })
          await chatLogger.logChat(userId, message)
        },
        onValidWord: async (roomId, word, userIndex, scoreDelta) => {
          io.to(roomId).emit('say word succeed', {
            word,
            userIndex,
            scoreDelta,
          })
          await roomLogger.logRoom('sayWord', { roomId, userId, word })
        },
        onInvalidWord: (roomId, word) => {
          io.to(roomId).emit('say word fail', word)
        },
        onError: (message) => {
          emitError(socket, message)
        },
      })
    })
  })
}

/**
 * @param {Server} io
 * @param {Socket} socket
 * @param {number} userId
 * @param {'game' | 'round' | 'turn'} state
 */
const startSocketTimer = (io, socket, userId, state) => {
  console.log(`start socket timer of user ${userId}`)

  const leftTime = 10 * 1000
  const timeout = setTimeout(onTimeout(io, socket, userId), leftTime)

  socketTimeouts[userId] = {
    timeout,
    state,
  }
}

/**
 * @param {number} userId
 * @param {'game' | 'round' | 'turn'} state
 * @returns
 */
const stopSocketTimer = (userId, state) => {
  if (!socketTimeouts[userId] || socketTimeouts[userId].state !== state) {
    return
  }

  console.log(`stop socket timer of user ${userId}`)

  clearTimeout(socketTimeouts[userId].timeout)
  socketTimeouts[userId] = null
}

/**
 * @param {Server} io
 * @param {Socket} socket
 * @param {number} userId
 */
const onTimeout = (io, socket, userId) => async () => {
  await onDisconnect(io, socket)
  socket.disconnect(true)
}

/**
 * @param {Server} io
 * @param {Socket} socket
 */
const onDisconnect = async (io, socket) => {
  quit(await fetchUserId(socket), {
    notifyUserQuit: (roomId, roomStatus) => {
      io.to(roomId).emit('some user leave room', roomStatus)
    },
    onRoomOwnerChange: (roomId, newRoomOwnerIndex) => {
      io.to(roomId).emit('change room owner', newRoomOwnerIndex)
    },
    notifyDestroyRoom: (roomId) => {
      io.to('LOBBY').emit('destroy room', { roomId })
    },
  })
}

/**
 * @param {Socket} socket
 * @param {string} message
 */
const emitError = (socket, message) => {
  socket.emit('error', message)
}

/**
 * @param {Socket} socket
 * @returns {Promise<number>}
 */
const fetchUserId = async (socket) => {
  /**
   * @type {string}
   */
  const sessionId = `${socket.handshake.headers.sessionid}`
  console.log(sessionId)

  const userId = (await authSession.get(sessionId))?.userId
  if (userId === undefined) return null

  return Number(userId)
}

/**
 * @param {Socket} socket
 * @returns {Promise<boolean>}
 */
const isUserSignedInApiServer = async (socket) => {
  const userId = await fetchUserId(socket)
  return await authSession.isSignedIn(userId)
}

/**
 * @param {Socket} socket
 * @returns {Promise<boolean>}
 */
const isUserOnline = async (socket) => {
  const userId = await fetchUserId(socket)
  return Lobby.instance.isUserOnline(userId)
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
 *   onComplete: (roomId: string, roomStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const createRoom = (roomConfig, { onComplete, onError }) => {
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

    onComplete(roomId)
  } catch (e) {
    if (e.type === 'invalidRoomConfigData') {
      onError(e.message)
    }
    if (e.type === 'changeOverCurrentUserCount') {
      onError(errorMessage.changeOverCurrentUserCount)
    }
    if (e.type === 'already1000RoomExist') {
      onError(errorMessage.already1000RoomExist)
    } else {
      onError(errorMessage.invalidRequest)
    }
  }
}

/**
 * @param {{
 *   roomId: string;
 *   userId: number;
 *   password?: string;
 * }} authorization
 * @param {{
 *   onComplete: (roomId: string, roomStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const joinRoom = (
  { roomId, userId, password = null },
  { onComplete, onError },
) => {
  try {
    Lobby.instance.tryJoiningRoom(roomId, userId, password)
    const gameRoom = Lobby.instance.getRoom(roomId)

    onComplete(gameRoom.id, userId)
  } catch (e) {
    onError(e.error)
  }
}

/**
 * @param {number} userId
 * @param {{
 *   onComplete: (roomId: string, roomStatus: *) => void;
 *   onError: (message: string) => void;
 *   onRoomOwnerChange:(roomId: string, roomStatus: *) => void;
 * }} callbacks
 */
const leaveRoom = (userId, { onComplete, onError, onRoomOwnerChange }) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null) {
    onError(errorMessage.invalidRequest)
    return
  }

  Lobby.instance.leaveRoom(userId, onRoomOwnerChange)

  onComplete(
    gameRoom.id,
    gameRoom.state === 'destroyed' ? undefined : gameRoom.fullInfo,
  )
}

/**
 * @param {number} userId
 * @param {{
 *   notifyUserQuit: (roomId: string, roomStatus: *) => void;
 *   onRoomOwnerChange: (roomId: string, newRoomOwnerIndex: number) => void;
 *   notifyDestroyRoom: (roomId: string) => void;
 * }} callbacks
 */
const quit = (
  userId,
  { notifyUserQuit, onRoomOwnerChange, notifyDestroyRoom },
) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom !== null) {
    notifyUserQuit(gameRoom.id, gameRoom.fullInfo)
  }

  Lobby.instance.quitUser(userId, onRoomOwnerChange)

  const isRoomDestroyed = gameRoom?.state === 'destroyed'
  if (isRoomDestroyed) {
    notifyDestroyRoom(gameRoom.id)
  }
}

/**
 * @param {number} userId
 * @param {boolean} state
 * @param {{
 *   onComplete: (roomId: string, gameStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const switchReadyState = (userId, state, { onComplete, onError }) => {
  if (typeof state !== 'boolean') {
    onError(errorMessage.invalidRequest)
    return
  }

  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null || gameRoom.state !== 'preparing') {
    onError(errorMessage.invalidRequest)
    return
  }

  const changedIndex = gameRoom.switchReadyState(userId, state)
  onComplete(gameRoom.id, changedIndex)
}

/**
 * @param {number} userId
 * @param {{
 *   title: string;
 *   password: string;
 *   maxUserCount: number;
 *   maxRound: number;
 *   roundTimeLimit: number;
 * }} roomConfig
 * @param {{
 *   onComplete: (roomId: string, roomInfo: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const changeRoomConfig = (userId, roomConfig, { onComplete, onError }) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (userId !== gameRoom.roomOwnerUserId) {
    onError(errorMessage.notARoomOnwner)
    return
  }
  try {
    gameRoom.changeRoomConfig({ ...roomConfig })
  } catch (e) {
    if (e.type === 'invalidRoomConfigData') {
      onError(e.message)
    } else if (e.type === 'changeOverCurrentUserCount') {
      onError(errorMessage.changeOverCurrentUserCount)
    } else if (e.type === 'notARoomOnwner') {
      onError(errorMessage.notARoomOnwner)
    } else {
      console.log(e)
      onError(errorMessage.unknownErrorOnChangeRoomConfig)
    }
    return
  }
  const roomInfo = gameRoom.info
  onComplete(gameRoom.id, roomInfo)
}

/**
 * @param {number} userId
 * @param {{
 *   onComplete: (roomId: string, gameStatus: *) => void;
 *   onError: (message: string) => void;
 *   onTimerTick: (roomId: string, timeStatus: {
 *     roundTimeLeft: number;
 *     personalTimeLeft: number;
 *   }) => void;
 *   onTurnEnd: (roomId: string) => void;
 *   onRoundEnd: (roomId: string, roundResult: {
 *     defeatedUserIndex: number;
 *     scoreDelta: number;
 *   }) => void;
 *   onGameEnd: (roomId: string, ranking: {
 *     userId: number;
 *     score: number;
 *   }[]) => void;
 * }} callbacks
 */
const startGame = async (
  userId,
  { onComplete, onError, onTimerTick, onTurnEnd, onRoundEnd, onGameEnd },
) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null || gameRoom.state !== 'preparing') {
    onError(errorMessage.unableToStart)
    return
  }

  const { isSuccess, message } = await gameRoom.startGame(userId, {
    onTimerTick,
    onTurnEnd,
    onRoundEnd,
    onGameEnd,
  })

  if (isSuccess === false) {
    onError(message)
    return
  }

  onComplete(gameRoom.id, gameRoom.currentGameStatus)
}

/**
 * @param {number} userId
 * @param {{
 *   onComplete: (
 *     roomId: string,
 *     gameStatus: *
 *   ) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const startRound = (userId, { onComplete, onError }) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null || gameRoom.state !== 'playing') {
    onError(errorMessage.invalidRequest)
    return
  }

  const startRoundResult = gameRoom.startRound(userId)

  if (startRoundResult === null) {
    return
  }

  onComplete(gameRoom.id, gameRoom.currentGameStatus)
}

/**
 * @param {number} userId
 * @param {{
 *   onComplete: (roomId: string, gameStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const startTurn = (userId, { onComplete, onError }) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null || gameRoom.state !== 'playing') {
    onError(errorMessage.invalidRequest)
    return
  }

  const startTurnResult = gameRoom.startTurn(userId)

  if (startTurnResult === null) {
    return
  }

  onComplete(gameRoom.id, gameRoom.currentGameStatus)
}

/**
 * @param {number} userId
 * @param {string} message
 * @param {{
 *   onOrdinaryChat: (roomId: string, message: string) => void
 *   onValidWord: (roomId: string, word: string, userIndex: number, scoreDelta: number) => void
 *   onInvalidWord: (roomId: string, word: string) => void
 *   onError: (message: string) => void
 * }} callbacks
 * @returns
 */
const chat = async (
  userId,
  message,
  { onOrdinaryChat, onValidWord, onInvalidWord, onError },
) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null) {
    onError(errorMessage.invalidRequest)
    return
  }

  if (gameRoom.state !== 'playing') {
    onOrdinaryChat(gameRoom.id, message)
    return
  }

  console.log(
    JSON.stringify({
      userId,
      message,
    }),
  )

  const { currentTurnUserIndex, currentTurnUserId, wordStartsWith } =
    gameRoom.currentGameStatus
  if (
    userId !== currentTurnUserId ||
    message.charAt(0) !== wordStartsWith ||
    message.length === 1
  ) {
    onOrdinaryChat(gameRoom.id, message)
    return
  }

  const scoreDelta = await gameRoom.sayWord(message)

  if (scoreDelta === -1) {
    console.log('error occurred in API Connection')
    onError(errorMessage.APIConeectionError)
    return
  }

  if (scoreDelta === null) {
    console.log('invalid word')
    onInvalidWord(gameRoom.id, message)
    return
  }

  console.log('valid word')
  onValidWord(gameRoom.id, message, currentTurnUserIndex, scoreDelta)
}
