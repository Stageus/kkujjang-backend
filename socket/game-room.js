import {
  getUserInfo,
  createRoom,
  validateJoinTicket,
  addGameRoomMember,
  leaveGameRoom,
} from '@socket/utility/game-room'

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

const emitNewGameRoom = (lobbyNamespace, gameRoomInfoWithId) => {
  lobbyNamespace.emit('new game room', gameRoomInfoWithId)
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

const emitRemoveGameRoom = (lobbyNamespace, gameRoomToLeaveId) => {
  lobbyNamespace.emit('remove game room', gameRoomToLeaveId)
}

const emitRemoveGameRoomMember = (gameRoomNamespace, userId) => {
  gameRoomNamespace.to(leftGameRoomId).emit('remove game room member', userId)
}

const emitAddGameRoomMember = (gameRoomNamespace, gameRoomId, userInfo) => {
  gameRoomNamespace
    .to(gameRoomId)
    .emit('add game room member', JSON.stringify(userInfo))
}

const emitFailJoinGameRoom = (socket, message) => {
  socket.emit('fail join game room', message)
}

export const createGameRoomSocket = (gameRoomNamespace, lobbyNamespace) => {
  gameRoomNamespace.on('connect', (socket) => {
    getUserInfo(socket)

    // 방 만들기 시도 이벤트가 발생
    socket.on('try create game room', (newGameRoomInfo) => {
      socket.join(gameRoomId)
      addChatEventLinstener(gameRoomNamespace, gameRoomId, socket)
      const gameRoomId = createRoom(newGameRoomInfo)
      emitDrawGameRoom(socket, gameRoomInfo)
      emitNewGameRoom(
        lobbyNamespace,
        JSON.stringify({
          gameRoomId,
          gameRoomInfo,
        }),
      )
    })

    // 방 참가하기 시도 이벤트가 발생
    socket.on('try join game room', (joinTicket) => {
      // 티켓의 정보를 보고 입장 가능한지 판단
      const result = validateJoinTicket(joinTicket)
      const { isValid, message, gameRoomId } = result

      // 입장 불가능하면 클라이언트에 입장 불가 메시지 전달
      if (isValid === false) {
        emitFailJoinGameRoom(socket, message)
      }
      // 해당 소켓을 gameRoomId에 연결
      socket.join(gameRoomId)
      // 채팅 이벤트 리스너 등록
      addChatEventLinstener(gameRoomNamespace, gameRoomId, socket)
      // 게임방 정보 JSON에 해당 멤버를 추가
      const gameRoomInfo = addGameRoomMember(socket, gameRoomId)
      // 게임방에 들어온 클라이언트에게 게임방을 그리라고 명령
      emitDrawGameRoom(socket, gameRoomInfo)
      // 게임방에 들어온 멈버를 그리라고 명령
      emitAddGameRoomMember(gameRoomNamespace, gameRoomId, socket.userInfo)
      // 로비에 게임방 입구 정보를 갱신하라고 명령
      emitRefreshGameRoom(lobbyNamespace, gameRoomId)
    })

    // 게임방 설정 바꾸기 시도 이벤트가 발생
    socket.on('try edit game room setting', () => {})
    // 게임 시작 시도 이벤트가 발생
    socket.on('try start game', () => {})
    // 플레이어 레디 상태 바꾸기 이벤트가 발생
    socket.on('try change player ready state', () => {})
    // 연결이 끊기는 이벤트(새로고침, 창 닫기 등)가 발생
    socket.on('disconnect', () => {
      // 게임방 정보 JSON에서 해당 멤버를 제거, 이후 몇명 남았는지 가져옴
      const curRoomMeberCount = leaveGameRoom(socket, gameRoomToLeaveId)
      // 방에 0명이 남았다면
      if (curRoomMeberCount === 0) {
        //  로비에 게임방 입구를 제거하라고 명령
        emitRemoveGameRoom(lobbyNamespace, gameRoomToLeaveId)
      }
      // 방에 아직 사람이 남아있다면
      else {
        // 로비에 게임방 입구 정보를 갱신하라고 명령
        emitRefreshGameRoom(lobbyNamespace, gameRoomToLeaveId)
        // 게임방에 나간 멤버를 지우라고 명령
        emitRemoveGameRoomMember(gameRoomNamespace, userInfo.id)
      }
    })
  })
}
