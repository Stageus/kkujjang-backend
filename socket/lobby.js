import { rooms } from '@socket/game-room'

export const createLobbySocket = (lobbyNamespace) => {
  lobbyNamespace.on('connection', (socket) => {
    socket.emit('load game room', rooms)
    socket.on('chat', (message) => {
      lobbyNamespace.emit('chat', message)
    })
  })
}
