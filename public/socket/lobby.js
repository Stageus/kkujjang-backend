// 이벤트 리스너
const addLobbyEventListener = () => {
  // 서버에서 메시지를 전달
  socket.on('message', (message) => {
    alert(message)
  })
  // 로비 최초 접속시 게임방 입구들을 그림
  socket.on('draw game enterance list', (gameRooms) => {
    drawGameEnteranceList(JSON.parse(gameRooms))
  })
  // 새로운 게임방이 생성되어 게임방 입구를 그림
  socket.on('new game enterance', (gameRoomInfoWithId) => {
    addGameEnterance(JSON.parse(gameRoomInfoWithId))
  })
  // 어떤 게임방의 정보가 바뀌어 게임방 입구도 갱신함
  socket.on('refresh game enterance', (gameRoomInfoWithId) => {
    refreshGameEnterance(JSON.parse(gameRoomInfoWithId))
  })
  // 참가자수가 0이 되어서 게임방 없어져 게임방 입구도 지움
  socket.on('remove game enterance', (roomId) => {
    document.getElementById(roomId).remove()
  })
}
// 이벤트 리스너 끝

// 게임방 연결
const createGameRoom = () => {
  const result = promptGameRoomSetting()
  const { isValid, gameRoomSetting } = result
  if (isValid === false) return

  connectToGameRoomSocket({
    isGameRoomCreate: true,
    gameRoomSetting,
  })
}

// 로비 연결
const connectToLobbySocket = () => {
  if (socket) {
    socket.disconnect()
  }
  socket = io('http://localhost:3000/lobby')

  addChatEventListener()
  addLobbyEventListener()
}
