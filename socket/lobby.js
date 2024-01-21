import { getUserInfo } from '@socket/utility/lobby'
import { gameRooms } from '@socket/utility/game-room'

const isConnectedToGameRoom = (socket) => {
  const gameRoomSocketId = socket.client.nsps.get('/gameRoom')?.id
  return gameRoomSocketId !== undefined ? true : false
}

const addChatEventListener = (lobbyNamespace, socket) => {
  socket.on('chat', (message) => {
    lobbyNamespace.emit('chat', `${socket.userInfo.nickname} : ${message}`)
  })
}

const emitMessage = (socket, message) => {
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
    // 유저 정보를 소켓으로 가져옴
    getUserInfo(socket)
    // 게임방 입구를 그리게 함
    emitLoadGameRoom(socket, gameRooms)
    // 채팅 이벤트 리스너 등록
    addChatEventListener(lobbyNamespace, socket)
  })
}
