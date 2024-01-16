import { rooms } from '@socket/game_room'

export const createLobbySocket = (lobbySocket) => {
  lobbySocket.on('connection', (socket) => {
    socket.emit('load game room', rooms)
    socket.on('chat', (message) => {
      lobbySocket.emit('chat', message)
    })
  })
}
