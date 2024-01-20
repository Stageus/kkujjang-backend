import * as uuid from 'uuid'

export const gameRooms = {}
export const gameRoomPasswords = {}
export const clientGameRoomId = {}

export const changePlayerReadyState = (socket) => {
  const curRedayState = socket.userInfo.isReady
  socket.userInfo.isReady = !curRedayState
}

export const changeGameRoomUserInfo = (socket, changeFunction) => {
  const gameRoomIdToChange = clientGameRoomId[socket.id]
  changeFunction(socket)
  gameRooms[gameRoomIdToChange].members[socket.userInfo.id] = socket.userInfo
  return gameRoomIdToChange
}

export const createRoom = (socket, newGameRoomSetting) => {
  const gameRoomId = uuid.v4()
  const { title, password, memberLimit, roundCount, roundTimeLimit } =
    newGameRoomSetting

  const isPasswordRoom = password !== '' ? true : false
  gameRoomPasswords[gameRoomId] = password

  const memberJson = {}
  memberJson[socket.userInfo.id] = socket.userInfo

  gameRooms[gameRoomId] = {
    isPasswordRoom,
    isInGame: false,
    title,
    memberCount: 1,
    memberLimit,
    roundCount,
    roundTimeLimit,
    members: memberJson,
  }

  const gameRoomInfo = JSON.parse(JSON.stringify(gameRooms[gameRoomId]))
  gameRoomInfo.members = Object.values(gameRoomInfo.members)

  const gameEnteranceInfo = {
    isPasswordRoom,
    isInGame: false,
    title,
    memberCount: 1,
    memberLimit,
    roundCount,
    roundTimeLimit,
  }

  clientGameRoomId[socket.id] = gameRoomId
  return {
    gameRoomId,
    gameRoomInfo,
    gameEnteranceInfo,
  }
}

export const validateJoinTicket = (joinTicket) => {
  const { gameRoomId, password } = joinTicket
  const { isPasswordRoom, isInGame, memberCount, memberLimit } =
    gameRooms[gameRoomId]

  if (memberLimit <= memberCount) {
    return {
      isValid: false,
      message: '이미 풀방입니다',
    }
  }
  if (isInGame) {
    return {
      isValid: false,
      message: '게임중인 방입니다',
    }
  }

  if (isPasswordRoom && gameRoomPasswords[gameRoomId] !== password) {
    return {
      isValid: false,
      message: '비밀번호가 일치하지 않습니다',
    }
  }

  return {
    isValid: true,
    gameRoomId,
  }
}

export const addGameRoomMember = (socket, gameRoomId) => {
  clientGameRoomId[socket.id] = gameRoomId
  gameRooms[gameRoomId].memberCount++
  gameRooms[gameRoomId].members[socket.userInfo.id] = socket.userInfo
}

export const leaveGameRoom = (socket) => {
  const socketId = socket.id
  const userInfo = socket.userInfo

  const gameRoomIdToLeave = clientGameRoomId[socketId]
  if (gameRoomIdToLeave === undefined) return {}

  delete clientGameRoomId[socketId]

  const gameRoomToLeave = gameRooms[gameRoomIdToLeave]
  delete gameRoomToLeave.members[socket.userInfo.id]

  const curRoomMeberCount = --gameRoomToLeave.memberCount

  if (curRoomMeberCount === 0) {
    delete gameRooms[gameRoomIdToLeave]
    delete gameRoomPasswords[gameRoomIdToLeave]
  }

  return {
    curRoomMeberCount,
    gameRoomIdToLeave,
    userInfo,
  }
}

export const changeGameRoomSetting = (socket, gameRoomSetting) => {
  const gameRoomId = clientGameRoomId[socket.id]
  const { title, password, memberLimit, roundCount, roundTimeLimit } =
    gameRoomSetting

  const isPasswordRoom = password !== '' ? true : false
  gameRoomPasswords[gameRoomId] = password

  const gameRoomInfo = gameRooms[gameRoomId]
  gameRoomInfo.isPasswordRoom = isPasswordRoom
  gameRoomInfo.title = title
  gameRoomInfo.memberLimit = memberLimit
  gameRoomInfo.roundCount = roundCount
  gameRoomInfo.roundTimeLimit = roundTimeLimit

  return {
    gameRoomId,
    gameRoomInfo,
  }
}

export const getGameRoomInfo = (gameRoomId) => {
  const gameRoomInfo = JSON.parse(JSON.stringify(gameRooms[gameRoomId]))
  gameRoomInfo.members = Object.values(gameRoomInfo.members)
  return gameRoomInfo
}

export const validateToStart = (socket) => {
  const gameRoomId = clientGameRoomId[socket.id]

  const gameRoomInfo = getGameRoomInfo(gameRoomId)
  const members = gameRoomInfo.members
  if (socket.userInfo.isCaptain === false) {
    return {
      isValid: false,
      message: '방장이 아닙니다',
    }
  }

  for (const member of members) {
    if (member.isCaptain === false && member.isReady === false) {
      return {
        isValid: false,
        message: '준비하지 않은 플레이어가 있습니다',
      }
    }
  }

  return {
    isValid: true,
    gameRoomId,
  }
}
