import { gameRooms } from '@socket/utility/game-room'

const emitChat = (lobbyNamespace, message) => {
  lobbyNamespace.emit('chat', message)
}

const emitLoadGameRoom = (socket, gameRooms) => {
  socket.emit('load game room', JSON.stringify(gameRooms))
}

export const createLobbySocket = (lobbyNamespace) => {
  lobbyNamespace.on('connection', (socket) => {
    // 최초 연결시 게임방 입구를 그리게 함
    emitLoadGameRoom(socket, gameRooms)
    // 채팅 이벤트가 발생했을때
    socket.on('chat', (message) => {
      // 로비에 브로드캐스팅 해준다
      emitChat(lobbyNamespace, message)
    })
  })
}
