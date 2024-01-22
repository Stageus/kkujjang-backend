import { getUserInfo } from '@socket/utility/lobby'
import { gameRooms } from '@socket/utility/game-room'

// 로비에 접속시 게임방과 연결되어있는지 확인
const isConnectedToGameRoom = (socket) => {
  const gameRoomSocketId = socket.client.nsps.get('/gameRoom')?.id
  return gameRoomSocketId !== undefined ? true : false
}

// 특정 소켓에게 메시지 전달
const emitMessage = (socket, message) => {
  socket.emit('message', message)
}

// 내 정보 그리라고 명령
const emitDrawUserInfo = (socket) => {
  socket.emit('draw my info', JSON.stringify(socket.userInfo))
}

// 게임방 입구 그리라고 명령
const emitLoadGameRoom = (socket, gameRooms) => {
  socket.emit('draw game enterance list', JSON.stringify(gameRooms))
}

// 채팅 이벤트리스너 등록
const addChatEventListener = (lobbyNamespace, socket) => {
  socket.on('chat', (message) => {
    lobbyNamespace.emit('chat', `${socket.userInfo.nickname} : ${message}`)
  })
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
    // 유저 정보를 그리게 함
    emitDrawUserInfo(socket)
    // 게임방 입구를 그리게 함
    emitLoadGameRoom(socket, gameRooms)
    // 채팅 이벤트 리스너 등록
    addChatEventListener(lobbyNamespace, socket)
  })
}
