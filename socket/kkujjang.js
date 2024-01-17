import { createLobbySocket } from '@socket/lobby'
import { createGameRoomSocket } from '@socket/game-room'

export const setSocket = (io) => {
  const lobbyNamespace = io.of('/lobby')
  const gameRoomNamespace = io.of('/gameRoom')

  createLobbySocket(lobbyNamespace)
  createGameRoomSocket(gameRoomNamespace, lobbyNamespace)
}
