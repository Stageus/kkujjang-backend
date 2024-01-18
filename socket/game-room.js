import * as uuid from 'uuid'

export const gameRooms = {}
export const gameRoomPasswords = {}
export const clientRoomId = {}

const nickname = [
  '감자',
  '다래',
  '슬기',
  '머루쉐',
  '손인욱',
  '김찬호',
  '김스테이지어스',
  '이스테이지어스',
  '박스테이지어스',
  '최스테이지어스',
]

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

const leaveGameRoom = (
  lobbyNamespace,
  gameRoomNamespace,
  userInfo,
  leftGameRoomId,
) => {
  const curRoomMeberCount = --gameRooms[leftGameRoomId].memberCount
  const curRooMembers = gameRooms[leftGameRoomId].members

  const index = curRooMembers.indexOf(userInfo)
  if (index > -1) {
    curRooMembers.splice(index, 1)
  }
  gameRooms[leftGameRoomId].members = curRooMembers

  if (curRoomMeberCount === 0) {
    lobbyNamespace.emit('remove game room', leftGameRoomId)
    delete gameRooms[leftGameRoomId]
    delete gameRoomPasswords[leftGameRoomId]
  } else {
    emitRefreshGameRoom(lobbyNamespace, leftGameRoomId)

    gameRoomNamespace
      .to(leftGameRoomId)
      .emit('remove game room member', userInfo.id)
  }
}

export const createGameRoomSocket = (gameRoomNamespace, lobbyNamespace) => {
  gameRoomNamespace.on('connect', (socket) => {
    const randomIndex = Math.floor(Math.random() * 8)

    socket.userInfo = {}
    socket.userInfo.id = randomIndex
    socket.userInfo.nickname = nickname[randomIndex]
    socket.userInfo.level = 1

    // 방 만들기 이벤트리스너 등록
    socket.on('create game room', (newRoomInfo) => {
      const gameRoomId = uuid.v4()
      const { title, password, memberLimit, roundCount, roundTimeLimit } =
        newRoomInfo

      const isPasswordRoom = password !== '' ? true : false
      gameRoomPasswords[gameRoomId] = password

      const gameRoomInfo = (gameRooms[gameRoomId] = {
        isPasswordRoom,
        isInGame: false,
        title,
        memberCount: 1,
        memberLimit,
        roundCount,
        roundTimeLimit,
        members: [socket.userInfo],
      })

      clientRoomId[socket.id] = gameRoomId
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
    socket.on('try join game room', (joinTicket) => {
      const { gameRoomId, password } = joinTicket
      const { isPasswordRoom, isInGame, memberCount, memberLimit } =
        gameRooms[gameRoomId]

      if (memberLimit <= memberCount) {
        socket.emit('fail join game room', '이미 풀방입니다')
        socket.disconnect(true)
        return
      }
      if (isInGame) {
        socket.emit('fail join game room', '게임중인 방입니다')
        socket.disconnect(true)
        return
      }

      if (isPasswordRoom && gameRoomPasswords[gameRoomId] !== password) {
        socket.emit('fail join game room', '비밀번호가 일치하지 않습니다')
        socket.disconnect(true)
        return
      }

      // 여기서부턴 접속 성공

      socket.join(gameRoomId)
      clientRoomId[socket.id] = gameRoomId
      gameRooms[gameRoomId].memberCount++
      gameRooms[gameRoomId].members.push(socket.userInfo)

      gameRoomNamespace
        .to(gameRoomId)
        .emit('add game room member', JSON.stringify(socket.userInfo))

      const gameRoomInfo = gameRooms[gameRoomId]

      addChatEventLinstener(gameRoomNamespace, gameRoomId, socket)
      emitDrawGameRoom(socket, gameRoomInfo)
      emitRefreshGameRoom(lobbyNamespace, gameRoomId)
    })

    socket.on('disconnect', () => {
      const leftGameRoomId = clientRoomId[socket.id]
      if (leftGameRoomId === undefined) {
        return
      }
      delete clientRoomId[socket.id]
      leaveGameRoom(
        lobbyNamespace,
        gameRoomNamespace,
        socket.userInfo,
        leftGameRoomId,
      )
    })
  })
}
