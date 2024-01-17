import * as uuid from 'uuid'

export const gameRooms = {}

const addChatEventLinstener = (gameRoomNamespace, gameRoomId, socket) => {
  socket.on('chat', (msg) => {
    gameRoomNamespace.to(gameRoomId).emit('chat', msg)
  })

  gameRoomNamespace
    .to(gameRoomId)
    .emit('chat', `${socket.userInfo.nickname}님이 참가했습니다`)
}

const emitDrawGameRoom = (socket, gameRoomInfo) => {
  socket.emit('draw game room', JSON.stringify(gameRoomInfo))
}

const emitRefreshGameRoom = (lobbyNamespace, gameRoomId) => {
  const gameRoomInfo = gameRooms[gameRoomId]
  lobbyNamespace.emit(
    'refresh game room',
    JSON.stringify({
      gameRoomId,
      gameRoomInfo,
    }),
  )
}

const nickname = [
  '감자',
  '머루',
  '다래',
  '슬기',
  '김스테이지어스',
  '이스테이지어스',
  '박스테이지어스',
  '최스테이지어스',
]

export const createGameRoomSocket = (gameRoomNamespace, lobbyNamespace) => {
  gameRoomNamespace.on('connect', (socket) => {
    const randomIndex = Math.floor(Math.random() * 8)
    // 최초 연결시 유저 정보 저장
    if (socket.userInfo === undefined) {
      socket.userInfo = {}
      socket.userInfo.id = randomIndex
      socket.userInfo.nickname = nickname[randomIndex]
      socket.userInfo.level = 1
    }

    // 방 만들기 이벤트리스너 등록
    socket.on('create game room', () => {
      const gameRoomId = uuid.v4()
      const gameRoomInfo = (gameRooms[gameRoomId] = {
        title: '아무나 환영',
        memberCount: 1,
        members: [socket.userInfo],
      })

      socket.join(gameRoomId)

      emitDrawGameRoom(socket, gameRoomInfo)

      lobbyNamespace.emit(
        'new game room',
        JSON.stringify({
          gameRoomId,
          gameRoomInfo,
        }),
      )

      addChatEventLinstener(gameRoomNamespace, gameRoomId, socket)
    })

    // 방 참가하기 이벤트리스너 등록
    socket.on('join game room', (gameRoomId) => {
      gameRoomNamespace
        .to(gameRoomId)
        .emit('add game room member', JSON.stringify(socket.userInfo))

      socket.join(gameRoomId)
      gameRooms[gameRoomId].memberCount++
      gameRooms[gameRoomId].members.push(socket.userInfo)
      const gameRoomInfo = gameRooms[gameRoomId]
      addChatEventLinstener(gameRoomNamespace, gameRoomId, socket)

      emitRefreshGameRoom(lobbyNamespace, gameRoomId)
      emitDrawGameRoom(socket, gameRoomInfo)
    })

    // 방 나가기 이벤트리스너 등록
    socket.on('leave game room', () => {
      for (const gameRoomId of socket.rooms) {
        if (gameRoomId === socket.id) {
          continue
        }

        const curRoomMeberCount = --gameRooms[gameRoomId].memberCount
        const curRooMembers = gameRooms[gameRoomId].members
        const index = curRooMembers.indexOf(socket.userInfo)
        if (index > -1) {
          curRooMembers.splice(index, 1)
        }
        gameRooms[gameRoomId].members = curRooMembers

        if (curRoomMeberCount === 0) {
          lobbyNamespace.emit('remove game room', gameRoomId)
          delete gameRooms[gameRoomId]
        } else {
          emitRefreshGameRoom(lobbyNamespace, gameRoomId)
          gameRoomNamespace
            .to(gameRoomId)
            .emit('remove game room member', socket.userInfo.id)
        }
      }
    })
  })
}
