import { createLobbySocket } from '@socket/lobby'
import { createGameRoomSocket } from '@socket/game_room'

export const setSocket = (io) => {
  const lobbyNamece = io.of('/lobby')
  const gameRoomNamespace = io.of('/gameRoom')

  createLobbySocket(lobbyNamece)
  createGameRoomSocket(gameRoomNamespace, lobbyNamece)
}
