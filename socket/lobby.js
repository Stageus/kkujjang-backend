import { gameRooms } from '@socket/utility/game-room'

const isConnectedToGameRoom = (socket) => {
  const gameRoomSocketId = socket.client.nsps.get('/gameRoom')?.id
  return gameRoomSocketId !== undefined ? true : false
}

const emitChat = (lobbyNamespace, message) => {
  lobbyNamespace.emit('chat', message)
}

const emitMessage = (socekt, message) => {
  socket.emit('message', message)
}

const emitLoadGameRoom = (socket, gameRooms) => {
  socket.emit('draw game enterance list', JSON.stringify(gameRooms))
}

export const createLobbySocket = (lobbyNamespace) => {
  lobbyNamespace.on('connection', (socket) => {
    // 게임방 소켓과 연결되어있는지 확인
    if (isConnectedToGameRoom(socket)) {
      emitMessage(socket, '오류가 발생했습니다 새로고침 해주세요')
      socket.disconnect(true)
      return
    }
    // 연결시 게임방 입구를 그리게 함
    emitLoadGameRoom(socket, gameRooms)
    // 채팅 이벤트가 발생했을때
    socket.on('chat', (message) => {
      // 로비에 브로드캐스팅 해준다
      emitChat(lobbyNamespace, message)
    })
  })
}
