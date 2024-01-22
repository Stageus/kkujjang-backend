import { getSession } from '@/utility/session'
import * as kkujjang from '@game/core'

const shuffleArray = (array) => {
  const newArray = [...array]

  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = newArray[i]
    newArray[i] = newArray[j]
    newArray[j] = temp
  }

  return newArray
}

const rooms = {
  sample: {
    state: 'preparing',
    users: [
      {
        userId: 1,
        isLeader: true,
        isReady: false,
        sessionId: 'test1',
      },
      {
        userId: 2,
        isLeader: false,
        isReady: true,
        sessionId: 'test2',
      },
      {
        userId: 3,
        isLeader: false,
        isReady: true,
        sessionId: 'test3',
      },
      {
        userId: 4,
        isLeader: false,
        isReady: true,
        sessionId: 'test4',
      },
    ],
    isSecure: true,
    config: {
      maxRound: 3,
      maxUserCount: 4,
      roundTimeLimit: 5 * 1000,
      password: 'password',
    },
    game: {
      usersRow: [
        {
          userId: 1,
          score: 0,
        },
      ],
      wordStartsWith: '단',
      currentRound: 0,
      currentTurn: 0,
      currentTurnAccumulative: 1,
      roundTimeLeft: 0,
      roundWord: '',
      timer: {
        startTime: 0,
        interval: null,
      },
    },
  },
}

const initializeGame = async (roomId) => {
  const room = rooms[roomId]

  room.state = 'playing'
  room.game = {
    /*shuffleArray(room.users).map((user) => ({
      userId: user.userId,
      score: 0,
    }))*/
    usersRow: [
      {
        userId: 1,
        score: 0,
      },
      {
        userId: 2,
        score: 0,
      },
      {
        userId: 3,
        score: 0,
      },
      {
        userId: 4,
        score: 0,
      },
    ],
    roundWord: await kkujjang.getRoundWord(room.config.maxRound),
  }

  return room.game
}

const initializeRound = (roomId) => {
  const room = rooms[roomId]
  const game = room.game

  game.currentRound =
    game.currentRound === undefined ? 0 : game.currentRound + 1
  game.currentTurn = 0
  game.currentTurnAccumulative = 1
  game.roundTimeLeft = room.config.roundTimeLimit
  game.wordStartsWith = room.game.roundWord[room.game.currentRound]
}

const applyScore = (roomId, scoreDelta) => {
  const room = rooms[roomId]

  room.game.usersRow[room.game.currentTurn].score += scoreDelta
  if (room.game.usersRow[room.game.currentTurn].score < 0)
    room.game.usersRow[room.game.currentTurn].score = 0
}

const timer = (gameRoomNamespace, roomId) => () => {
  const room = rooms[roomId]

  const timeElapsed = Date.now() - room.game.timer.startTime
  const roundTimeLeft = room.config.roundTimeLimit - timeElapsed
  const personalTimeLeft = Math.floor(roundTimeLeft / 10)

  room.game.roundTimeLeft = roundTimeLeft
  gameRoomNamespace
    .to(roomId)
    .emit('timer', { roundTimeLeft, personalTimeLeft })

  if (roundTimeLeft <= 0 && personalTimeLeft <= 0) {
    clearInterval(room.game.timer.interval)

    const scoreDelta = -kkujjang.getFailureScore()
    applyScore(roomId, scoreDelta)

    gameRoomNamespace.to(roomId).emit('round end', {
      defeatedUserTurn: room.game.currentTurn,
      scoreDelta,
    })
  }
}

export const createGameRoomSocket = (gameRoomNamespace, lobbyNamespace) => {
  gameRoomNamespace.on('connection', (socket) => {
    socket.prependAny(() => {
      const cookieList = String(socket.handshake.headers.cookie).split(';')

      socket.handshake.headers.cookies = {}
      cookieList.forEach((cookieText) => {
        const cookieData = cookieText.split('=')
        socket.handshake.headers.cookies[cookieData[0]] = cookieData[1]
      })
    })

    //test
    socket.join('sample')

    socket.on('game start', async (roomId) => {
      console.log(`game start ${roomId}`)
      const room = rooms[roomId]

      if (!room || room.state !== 'preparing') {
        gameRoomNamespace.to(roomId).emit('error', '잘못된 요청입니다.')
        return
      }

      const game = await initializeGame(roomId)
      gameRoomNamespace.emit('game start', game)
    })

    socket.on('round start', (roomId) => {
      console.log(`round start ${roomId}`)
      const room = rooms[roomId]

      if (!room) {
        gameRoomNamespace.to(roomId).emit('error', '잘못된 요청입니다.')
        return
      }

      initializeRound(roomId)

      // 마지막 라운드
      if (room.game.currentRound >= room.config.maxRound) {
        console.log(`game end ${roomId}`)
        gameRoomNamespace.to(roomId).emit('game end', {
          // TODO: sort
          ranking: room.game.usersRow,
        })
        room.state = 'preparing'
        return
      }

      gameRoomNamespace.to(roomId).emit('round start', {
        roundWord: room.game.roundWord,
        currentRound: room.game.currentRound,
      })
    })

    socket.on('turn start', async (roomId) => {
      console.log(`turn start ${roomId}`)
      const room = rooms[roomId]

      if (!room) {
        gameRoomNamespace.to(roomId).emit('error', '잘못된 요청입니다.')
        return
      }

      const { sessionId } = socket.handshake.headers.cookies
      const userId = (await getSession(sessionId))?.userId
      const userIdCurrentTurn = room.game.usersRow[room.game.currentTurn].userId

      // if (Number(userId) !== Number(userIdCurrentTurn)) {
      //   return
      // }

      room.game.timer = {
        startTime: Date.now(),
        interval: setInterval(timer(gameRoomNamespace, roomId), 100),
      }

      gameRoomNamespace.to(roomId).emit('turn start', {
        currentTurn: room.game.currentTurn,
        wordStartsWith: room.game.wordStartsWith,
      })
    })

    socket.on('chat', async ({ roomId, message }) => {
      const room = rooms[roomId]

      if (!room) {
        gameRoomNamespace.to(roomId).emit('error', '잘못된 요청입니다.')
        return
      }

      const sessionId = socket.handshake.headers.cookies.sessionId ?? null
      const userId = (await getSession(sessionId))?.userId

      if (!userId) {
        gameRoomNamespace.to(roomId).emit('error', '잘못된 요청입니다.')
        return
      }

      console.log(
        JSON.stringify({
          message,
          userId,
          userIdTurn: room.game.usersRow[room.game.currentTurn].userId,
        }),
      )

      if (
        Number(userId) ===
          Number(room.game.usersRow[room.game.currentTurn].userId) &&
        message?.charAt(0) === room.game.wordStartsWith
      ) {
        // TODO: 단어 체크 로직 적용
        const isValidWord = true

        if (isValidWord) {
          clearInterval(room.game.timer.interval)

          room.game.currentTurn =
            (room.game.currentTurn + 1) % room.users.length
          room.game.currentTurnAccumulative += 1

          const scoreDelta = applyScore(
            roomId,
            kkujjang.getSuccessScore(
              message.length,
              room.config.roundTimeLimit,
              room.game.roundTimeLeft,
              room.game.currentTurnAccumulative,
            ),
          )

          gameRoomNamespace
            .to(roomId)
            // TODO: 점수 공식
            .emit('say word', {
              userId,
              word: message,
              scoreDelta,
            })
        } else {
          gameRoomNamespace
            .to(roomId)
            .emit('say word wrong', { userId, word: message })
        }
      } else {
        gameRoomNamespace.to(roomId).emit('chat', { userId, message })
      }
    })
  })
}
