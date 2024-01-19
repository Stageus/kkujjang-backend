// 이벤트 리스너
const addGameRoomEventListener = () => {
  // 입장시 서버가 준 정보를 바탕으로 게임방을 그림
  socket.on('draw game room', (gameRoomInfo) => {
    drawGameRoom(JSON.parse(gameRoomInfo))
  })
  // 어떤 플레이어가 들어옴
  socket.on('add game room member', (userInfo) => {
    addGameRoomMember(JSON.parse(userInfo))
  })
  // 어떤 플레이어가 나감
  socket.on('remove game room member', (userId) => {
    removeGameRoomMember(userId)
  })
  // 어떤 멤버의 상태가 바뀜
  socket.on('change member state', (userInfo) => {
    changeMemberState(JSON.parse(userInfo))
  })
  // 방 설정이 바뀜
  socket.on('change game room setting', (gameRoomInfo) => {
    changeRoomSetting(JSON.parse(gameRoomInfo))
  })
  // 게임이 시작됨
  socket.on('start game', (gameRoomInfo) => {
    drawInGame(JSON.parse(gameRoomInfo))
  })
  // 게임방에 접속을 시도했는데 실패함
  socket.on('fail join game room', (msg) => {
    alert(msg)
  })
  // 게임방과 연결이 끊어짐(새로고침 등)
  socket.on('disconnect', () => {
    connectToLobbySocket()
  })
}
// 이벤트 리스너 끝

// 이벤트 트리거
// 방 설정을 바꾸기를 시도
const tryEditGameRoomSettingEvent = () => {
  const result = promptGameRoomInfo()
  const { isValid, gameRoomInfo } = result
  if (isValid === false) return

  socket.emit('try edit game room setting', {
    gameRoomInfo,
  })
}
// 게임 시작 시도
const tryStartGameEvent = () => {
  socket.emit('try start game')
}
// 레디 상태 변경 시도
const tryChangePlayerReadyStateEvent = () => {
  socket.emit('try change player ready state')
}
// 이벤트 트리거 끝

// 게임 나가기
const leaveGameRoom = () => {
  gameRoomContain.innerHTML = ''
  socket.disconnect()
}

// 게임방 연결
const connectToGameRoomSocket = (connectType) => {
  if (socket) {
    socket.disconnect()
  }
  socket = io('http://localhost:3000/gameRoom')

  const { isGameRoomCreate, gameRoomInfo } = connectType

  const emitMsg =
    isGameRoomCreate === true ? 'try create game room' : 'try join game room'

  socket.on('connect', () => {
    socket.emit(emitMsg, gameRoomInfo)
    addChatEventListener()
    addGameRoomEventListener()
  })
}
