import { gameRooms } from '@socket/game-room'
import { gameRoomPasswords } from '@socket/game-room'

export const createLobbySocket = (lobbyNamespace) => {
  lobbyNamespace.on('connection', (socket) => {
    socket.emit('load game room', JSON.stringify(gameRooms))

    socket.on('try join game room', (joinTicket) => {
      const gameRoomId = joinTicket.gameRoomId
      const gameRoomPassword = gameRoomPasswords[gameRoomId]
      const gameRoom = gameRooms[gameRoomId]

      if (gameRoom === null || gameRoom === undefined) {
        socket.emit('fail join game room', '존재하지 않는 방입니다')
        return
      }

      if (gameRoom.memberLimit <= gameRoom.memberCount) {
        socket.emit('fail join game room', '입장 가능 인원수를 초과하였습니다')
        return
      }

      if (gameRoom.isPasswordRoom === false) {
        socket.emit('success join game room', gameRoomId)
        return
      }

      if (gameRoomPassword !== joinTicket.password) {
        socket.emit('fail join game room', '비밀번호가 일치하지 않습니다')
        return
      }

      socket.emit('success join game room', gameRoomId)
    })

    socket.on('chat', (message) => {
      lobbyNamespace.emit('chat', message)
    })
  })
}
