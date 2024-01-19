import * as uuid from 'uuid'

const nickname = [
  '감자',
  '다래',
  '슬기',
  '머루쉐',
  '손인욱',
  '김찬호',
  '김스테이지어스',
  '이스테이지어스',
  '박스테이지어스',
  '최스테이지어스',
]

export const gameRooms = {}
export const gameRoomPasswords = {}
export const clientRoomId = {}

export const getUserInfo = (socket) => {
  const randomIndex = Math.floor(Math.random() * 8)
  socket.userInfo = {}
  socket.userInfo.id = randomIndex
  socket.userInfo.nickname = nickname[randomIndex]
  socket.userInfo.level = 1
}

export const createRoom = (socket, newGameRoomInfo) => {
  const gameRoomId = uuid.v4()
  const { title, password, memberLimit, roundCount, roundTimeLimit } =
    newGameRoomInfo

  const isPasswordRoom = password !== '' ? true : false
  gameRoomPasswords[gameRoomId] = password

  const gameRoomInfo = (gameRooms[gameRoomId] = {
    isPasswordRoom,
    isInGame: false,
    title,
    memberCount: 1,
    memberLimit,
    roundCount,
    roundTimeLimit,
    members: [socket.userInfo],
  })

  clientRoomId[socket.id] = gameRoomId
  return {
    gameRoomId,
    gameRoomInfo,
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
  clientRoomId[socket.id] = gameRoomId
  gameRooms[gameRoomId].memberCount++
  gameRooms[gameRoomId].members.push(socket.userInfo)
}

export const leaveGameRoom = (socket) => {
  const socketId = socket.id
  const userInfo = socket.userInfo

  const gameRoomIdToLeave = clientRoomId[socketId]
  if (gameRoomIdToLeave === undefined) return {}

  delete clientRoomId[socketId]
  const curRoomMeberCount = --gameRooms[gameRoomIdToLeave].memberCount
  const curRooMembers = gameRooms[gameRoomIdToLeave].members

  const index = curRooMembers.indexOf(userInfo)
  if (index > -1) {
    curRooMembers.splice(index, 1)
  }
  gameRooms[gameRoomIdToLeave].members = curRooMembers

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

export const getGameRoomInfo = (gameRoomId) => gameRooms[gameRoomId]
