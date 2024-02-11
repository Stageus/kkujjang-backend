// @ts-check

import { Server, Socket } from 'socket.io'
import { authSession } from 'kkujjang-session'
import { errorMessage } from '#utility/error'
import { parseCookie } from '#utility/cookie-parser'
import { GameRoom } from '#game/gameRoom'
import { Lobby } from '#game/lobby'

/**
 * @param {Server} io
 */
export const setupKkujjangWebSocket = (io) => {
  io.on('connection', async (socket) => {
    if (!(await isUserSignedInApiServer(socket))) {
      socket.emit('error', '권한이 없습니다.')
      return
    }

    if (await isUserOnline(socket)) {
      socket.emit('error', '다른 기기에서 게임에 접속 중입니다.')
      return
    }

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
          onComplete: (roomId) => {
            socket.join(roomId)
            socket.emit('complete create room')
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
            onComplete: (roomId, userId) => {
              io.to(roomId).emit('some user join room', userId)
              socket.leave('LOBBY')
              socket.join(roomId)
              socket.emit('complete join room', userId)
            },
            onError: (message) => emitError(socket, message),
          },
        )
      },
    )

    socket.on('leave room', async () => {
      leaveRoom(await fetchUserId(socket), {
        onComplete: (roomId, roomStatus) => {
          socket.leave(roomId)
          socket.join('LOBBY')
          io.to(roomId).emit('some user leave room', roomStatus)
          socket.emit('complete leave room')
        },
        onRoomOwnerChange: (roomId, newRoomOwnerIndex) => {
          io.to(roomId).emit('change room owner', newRoomOwnerIndex)
        },
        onError: (message) => {
          emitError(socket, message)
        },
      })
    })

    socket.on('disconnect', async () => {
      quit(await fetchUserId(socket), {
        notifyUserQuit: (roomId, roomStatus) => {
          io.to(roomId).emit('some user leave room', roomStatus)
        },
        onRoomOwnerChange: (roomId, newRoomOwnerIndex) => {
          io.to(roomId).emit('change room owner', newRoomOwnerIndex)
        },
      })
    })

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

    socket.on('game start', async () => {
      await startGame(await fetchUserId(socket), {
        onComplete: (roomId, gameStatus) => {
          io.to(roomId).emit('complete game start', gameStatus)
        },
        onError: (message) => {
          emitError(socket, message)
        },
      })
    })

    socket.on('round start', async () => {
      startRound(await fetchUserId(socket), {
        onComplete: (roomId, gameStatus) => {
          io.to(roomId).emit('complete round start', gameStatus)
        },
        onError: (message) => {
          emitError(socket, message)
        },
      })
    })

    socket.on('turn start', async () => {
      startTurn(await fetchUserId(socket), {
        onComplete: (roomId, gameStatus) => {
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
        onRoundEnd: (roomId, roundResult) => {
          io.to(roomId).emit('round end', roundResult)
        },
        onGameEnd: (roomId, ranking) => {
          io.to(roomId).emit('game end', ranking)
        },
      })
    })

    socket.on('chat', async (message) => {
      await chat(await fetchUserId(socket), message, {
        onOrdinaryChat: (roomId) => {
          io.to(roomId).emit('chat', message)
        },
        onValidWord: (roomId, word, userIndex, scoreDelta) => {
          io.to(roomId).emit('say word succeed', {
            word,
            userIndex,
            scoreDelta,
          })
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
  const { sessionId } = parseCookie(socket.handshake.headers.cookie)
  if (!sessionId) return null

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

    onComplete(gameRoom.id, gameRoom.fullInfo)
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
 * }} callbacks
 */
const quit = (userId, { notifyUserQuit, onRoomOwnerChange }) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom !== null) {
    notifyUserQuit(gameRoom.id, gameRoom.fullInfo)
  }

  Lobby.instance.quitUser(userId, onRoomOwnerChange)
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

  gameRoom.switchReadyState(userId, state)
  onComplete(gameRoom.id, gameRoom.fullInfo)
}

/**
 * @param {number} userId
 * @param {{
 *   onComplete: (roomId: string, gameStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const startGame = async (userId, { onComplete, onError }) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null || gameRoom.state !== 'preparing') {
    onError(errorMessage.unableToStart)
    return
  }

  const gameStartResult = await gameRoom.startGame(userId)

  if (gameStartResult === null) {
    onError(JSON.stringify(gameRoom.fullInfo))
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
 *   onComplete: (roomId: string, gameStatus: *) => void;
 *   onError: (message: string) => void;
 * }} callbacks
 */
const startTurn = (
  userId,
  { onTurnEnd, onTimerTick, onRoundEnd, onGameEnd, onComplete, onError },
) => {
  const gameRoom = Lobby.instance.getRoomByUserId(userId)

  if (gameRoom === null || gameRoom.state !== 'playing') {
    onError(errorMessage.invalidRequest)
    return
  }

  const startTurnResult = gameRoom.startTurn(userId, {
    onTimerTick,
    onTurnEnd,
    onRoundEnd,
    onGameEnd,
  })

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
  if (userId !== currentTurnUserId || message.charAt(0) !== wordStartsWith) {
    onOrdinaryChat(gameRoom.id, message)
    return
  }

  const scoreDelta = await gameRoom.sayWord(message)

  if (scoreDelta === null) {
    console.log('invalid word')
    onInvalidWord(gameRoom.id, message)
    return
  }

  console.log('valid word')
  onValidWord(gameRoom.id, message, currentTurnUserIndex, scoreDelta)
}
