import * as uuid from 'uuid'

const roomMember = {}
export const rooms = []

export const createGameRoomSocket = (gameRoomNamespace, lobbyNamespace) => {
  gameRoomNamespace.on('connection', (socket) => {
    // 방 만들기 이벤트리스너 등록
    socket.on('create game room', () => {
      const roomId = uuid.v4()
      roomMember[roomId] = 1

      const roomInfo = JSON.stringify({
        id: roomId,
        title: '아무나 환영',
      })

      rooms.push(roomInfo)

      lobbyNamespace.emit('new game room', roomInfo)
      socket.join(roomId)
      socket.on('chat', (msg) => {
        gameRoomNamespace.to(roomId).emit('chat', msg)
      })

      gameRoomNamespace.to(roomId).emit('chat', '누군가가 참가했습니다')
    })

    // 방 참가하기 이벤트리스너 등록
    socket.on('join game room', (roomId) => {
      socket.join(roomId)
      roomMember[roomId]++
      socket.on('chat', (msg) => {
        gameRoomNamespace.to(roomId).emit('chat', msg)
      })
      gameRoomNamespace.to(roomId).emit('chat', '누군가가 참가했습니다')
    })

    // 방 나가기 이벤트리스너 등록
    socket.on('leave game room', () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) {
          continue
        }
        const curRoomMeber = --roomMember[roomId]

        if (curRoomMeber === 0) {
          lobbyNamespace.emit('remove game room', roomId)

          let index = 0
          for (const roomInfo of rooms) {
            if (roomId === JSON.parse(roomInfo).id) {
              break
            }
            index++
          }
          if (index > -1) {
            rooms.splice(index, 1)
          }
        }
      }
    })
  })
}
