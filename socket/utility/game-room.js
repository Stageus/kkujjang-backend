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

export const createRoom = (newGameRoomInfo) => {
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
  return gameRoomId
}

export const validateJoinTicket = (joinTicket) => {
  const { gameRoomId, password } = joinTicket
  const { isPasswordRoom, isInGame, memberCount, memberLimit } =
    gameRooms[gameRoomId]

  if (memberLimit <= memberCount) {
    socket.emit('fail join game room', '이미 풀방입니다')
    socket.disconnect(true)
    return
  }
  if (isInGame) {
    socket.emit('fail join game room', '게임중인 방입니다')
    socket.disconnect(true)
    return
  }

  if (isPasswordRoom && gameRoomPasswords[gameRoomId] !== password) {
    socket.emit('fail join game room', '비밀번호가 일치하지 않습니다')
    socket.disconnect(true)
    return
  }
}

export const addGameRoomMember = (socket, gameRoomId) => {
  clientRoomId[socket.id] = gameRoomId
  gameRooms[gameRoomId].memberCount++
  gameRooms[gameRoomId].members.push(socket.userInfo)

  const gameRoomInfo = gameRooms[gameRoomId]
}

export const leaveGameRoom = (socket, gameRoomToLeaveId) => {
  const socketId = socket.id
  const userInfo = socket.userInfo

  const gameRoomToLeaveId = clientRoomId[socketId]
  delete clientRoomId[socketId]
  const curRoomMeberCount = --gameRooms[gameRoomToLeaveId].memberCount
  const curRooMembers = gameRooms[gameRoomToLeaveId].members

  const index = curRooMembers.indexOf(userInfo)
  if (index > -1) {
    curRooMembers.splice(index, 1)
  }
  gameRooms[gameRoomToLeaveId].members = curRooMembers

  if (curRoomMeberCount === 0) {
    delete gameRooms[gameRoomToLeaveId]
    delete gameRoomPasswords[gameRoomToLeaveId]
  }

  return curRoomMeberCount
}
