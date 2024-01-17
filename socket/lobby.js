import { gameRooms } from '@socket/game-room'

export const createLobbySocket = (lobbyNamespace) => {
  lobbyNamespace.on('connection', (socket) => {
    socket.emit('load game room', JSON.stringify(gameRooms))

    socket.on('chat', (message) => {
      lobbyNamespace.emit('chat', message)
    })
  })
}
