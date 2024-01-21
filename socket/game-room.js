import {
  createRoom,
  getGameRoomId,
  validateJoinTicket,
  validateToStart,
  addGameRoomMember,
  leaveGameRoom,
  getGameRoomInfo,
  changeCaptain,
  changeGameRoomSetting,
  changePlayerReadyState,
  changeGameRoomUserInfo,
  getUserInfo,
} from '@socket/utility/game-room'

const isConnectedToLobby = (socket) => {
  const lobbySocketId = socket.client.nsps.get('/lobby')?.id
  return lobbySocketId !== undefined ? true : false
}

const addChatEventLinstener = (gameRoomNamespace, gameRoomId, socket) => {
  socket.on('chat', (message) => {
    validateChatMessage(message)
    gameRoomNamespace
      .to(gameRoomId)
      .emit(
        'chat',
        `${
          getUserInfo(getGameRoomId(socket.id), socket.id).nickname
        } : ${message}`,
      )
  })

  gameRoomNamespace
    .to(gameRoomId)
    .emit(
      'chat',
      `${
        getUserInfo(getGameRoomId(socket.id), socket.id).nickname
      }님이 참가했습니다`,
    )
}

const emitDrawGameRoom = (socket, gameRoomInfo) => {
  socket.emit('draw game room', JSON.stringify(gameRoomInfo))
}

const emitNewGameEnterance = (lobbyNamespace, gameRoomInfoWithId) => {
  lobbyNamespace.emit('new game enterance', gameRoomInfoWithId)
}

const emitRefreshGameRoomMember = (gameRoomNamespace, gameRoomId, userInfo) => {
  gameRoomNamespace
    .to(gameRoomId)
    .emit('refresh game room member', JSON.stringify(userInfo))
}

const emitRefreshGameEnterance = (lobbyNamespace, gameRoomId) => {
  const gameRoomInfo = getGameRoomInfo(gameRoomId)
  lobbyNamespace.emit(
    'refresh game enterance',
    JSON.stringify({
      gameRoomId,
      gameRoomInfo,
    }),
  )
}

const emitRemoveGameEnterance = (lobbyNamespace, gameRoomIdToLeave) => {
  lobbyNamespace.emit('remove game enterance', gameRoomIdToLeave)
}

const emitRemoveGameRoomMember = (
  gameRoomNamespace,
  gameRoomIdToLeave,
  userId,
) => {
  gameRoomNamespace
    .to(gameRoomIdToLeave)
    .emit('remove game room member', userId)
}

const emitAddGameRoomMember = (gameRoomNamespace, gameRoomId, userInfo) => {
  gameRoomNamespace
    .to(gameRoomId)
    .emit('add game room member', JSON.stringify(userInfo))
}

const emitChangeGameRoomSetting = (
  gameRoomNamespace,
  gameRoomId,
  gameRoomInfo,
) => {
  gameRoomNamespace
    .to(gameRoomId)
    .emit('change game room setting', JSON.stringify(gameRoomInfo))
}

const emitFailJoinGameRoom = (socket, message) => {
  socket.emit('fail join game room', message)
}

const emitYouAreCaptain = (socket) => {
  socket.emit('you are captain')
}

const emitYouAreCrew = (socket) => {
  socket.emit('you are crew')
}

const emitStartGame = (gameRoomNamespace, gameRoomId) => {
  gameRoomNamespace.to(gameRoomId).emit('start game')
}

export const createGameRoomSocket = (gameRoomNamespace, lobbyNamespace) => {
  gameRoomNamespace.on('connect', (socket) => {
    // 로비 소켓과 연결되어있는지 확인
    if (isConnectedToLobby(socket)) {
      emitFailJoinGameRoom(socket, '로비와 연결해제에 실패했습니다')
      socket.disconnect(true)
      return
    }

    // 방 만들기 시도 이벤트가 발생
    socket.on('try create game room', (newGameRoomSetting) => {
      const { gameRoomId, gameRoomInfo } = createRoom(
        socket,
        newGameRoomSetting,
      )
      socket.join(gameRoomId)
      addChatEventLinstener(gameRoomNamespace, gameRoomId, socket)
      emitDrawGameRoom(socket, gameRoomInfo)
      emitYouAreCaptain(socket)
      emitNewGameEnterance(
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
        socket.disconnect(true)
        return
      }

      // 게임방 정보 JSON에 해당 멤버를 추가
      addGameRoomMember(socket, gameRoomId)
      // 기존 멤버들에게는 게임방에 들어온 멈버를 그리라고 명령
      emitAddGameRoomMember(
        gameRoomNamespace,
        gameRoomId,
        getUserInfo(gameRoomId, socket.id),
      )
      // 로비에 게임방 입구 정보를 갱신하라고 명령
      emitRefreshGameEnterance(lobbyNamespace, gameRoomId)
      // 해당 소켓을 gameRoomId에 연결
      socket.join(gameRoomId)
      // 채팅 이벤트 리스너 등록
      addChatEventLinstener(gameRoomNamespace, gameRoomId, socket)
      // 게임방 정보를 가져옴
      const gameRoomInfo = getGameRoomInfo(gameRoomId)
      // 게임방에 들어온 클라이언트에게 게임방을 그리라고 명령
      emitDrawGameRoom(socket, gameRoomInfo)
      emitYouAreCrew(socket)
    })

    // 게임방 설정 바꾸기 시도 이벤트가 발생
    socket.on('try change game room setting', (gameRoomSetting) => {
      if (
        getUserInfo(getGameRoomId(socket.id), socket.id).isCaptain === false
      ) {
        emitFailJoinGameRoom(socket, '방장이 아닙니다')
        return
      }
      const { gameRoomId, gameRoomInfo } = changeGameRoomSetting(
        socket,
        gameRoomSetting,
      )
      emitChangeGameRoomSetting(gameRoomNamespace, gameRoomId, gameRoomInfo)
      emitRefreshGameEnterance(lobbyNamespace, gameRoomId)
    })
    // 플레이어 레디 상태 바꾸기 이벤트가 발생
    socket.on('try change player ready state', () => {
      if (getUserInfo(getGameRoomId(socket.id), socket.id).isCaptain === true) {
        if (isValid === false) {
          emitFailJoinGameRoom(socket, '방장은 레디할 수 없습니다')
        }
      }
      const gameRoomIdToChange = changeGameRoomUserInfo(
        socket,
        changePlayerReadyState,
      )
      emitRefreshGameRoomMember(
        gameRoomNamespace,
        gameRoomIdToChange,
        getUserInfo(getGameRoomId(socket.id), socket.id),
      )
    })
    // 게임 시작 시도 이벤트가 발생
    socket.on('try start game', () => {
      const { isValid, message, gameRoomId } = validateToStart(socket)
      if (isValid === false) {
        emitFailJoinGameRoom(socket, message)
      }
      emitStartGame(gameRoomNamespace, gameRoomId)
    })
    // 연결이 끊기는 이벤트(새로고침, 창 닫기 등)가 발생
    socket.on('disconnect', () => {
      // 게임방 정보 JSON에서 해당 멤버를 제거
      const { curRoomMeberCount, gameRoomIdToLeave, isCaptain } =
        leaveGameRoom(socket)
      // 떠날 방이 없다면 return
      if (gameRoomIdToLeave === undefined) {
        return
      }
      // 방에 0명이 남았다면
      if (curRoomMeberCount === 0) {
        //  로비에 게임방 입구를 제거하라고 명령
        emitRemoveGameEnterance(lobbyNamespace, gameRoomIdToLeave)
      }
      // 방에 아직 사람이 남아있다면
      else {
        // 방장이였다면 방장을 넘겨준다
        if (isCaptain === true) {
          const captainSocketId = changeCaptain(gameRoomIdToLeave)
          emitYouAreCaptain(gameRoomNamespace.to(captainSocketId))
          emitRefreshGameRoomMember(
            gameRoomNamespace,
            gameRoomIdToLeave,
            getUserInfo(gameRoomIdToLeave, captainSocketId),
          )
        }
        // 로비에 게임방 입구 정보를 갱신하라고 명령
        emitRefreshGameEnterance(lobbyNamespace, gameRoomIdToLeave)
        // 게임방에 나간 멤버를 지우라고 명령
        emitRemoveGameRoomMember(
          gameRoomNamespace,
          gameRoomIdToLeave,
          socket.id,
        )
      }
    })
  })
}
