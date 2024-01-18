// 이벤트 리스너
const addLobbyEventListener = () => {
  // 로비 최초 접속시 게임방 입구들을 그림
  socket.on('draw game enterance list', (gameRooms) => {
    drawGameEnteranceList(JSON.parse(gameRooms))
  })
  // 새로운 게임방이 생성되어 게임방 입구를 그림
  socket.on('new game room', (gameRoomInfoWithId) => {
    addGameEnterance(JSON.parse(gameRoomInfoWithId))
  })
  // 어떤 게임방의 정보가 바뀌어 게임방 입구도 갱신함
  socket.on('refresh game room', (gameRoomInfoWithId) => {
    refereshGameEnterance(JSON.parse(gameRoomInfoWithId))
  })
  // 참가자수가 0이 되어서 게임방 없어져 게임방 입구도 지움
  socket.on('remove game room', (roomId) => {
    document.getElementById(roomId).remove()
  })
}
// 이벤트 리스너 끝

// 게임방 연결
const createGameRoom = () => {
  const result = promptGameRoomInfo()
  const { isValid, gameRoomInfo } = result
  if (isValid === false) return

  connectGameRoomSocket({
    isGameRoomCreate: true,
    gameRoomInfo,
  })
}

// 로비 연결
const connectLobbySocket = () => {
  socket = io('http://localhost:3000/lobby')

  addChatEventListener()
  addLobbyEventListener()
}
