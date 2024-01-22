import * as uuid from 'uuid'
import * as validation from '@utility/validation'

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
export const clientGameRoomId = {}

export const checkGameRoonSetting = (gameRoomSetting) => {
  try {
    const { title, password, memberLimit, roundCount, roundTimeLimit } =
      gameRoomSetting

    validation.check(
      title,
      'title',
      validation.checkExist(),
      validation.checkLength(1, 20),
    )

    password !== '' &&
      validation.check(
        password,
        'password',
        validation.checkExist(),
        validation.checkRegExp(/^[\x00-\x7F]{1,30}$/),
      )

    validation.check(
      memberLimit,
      'memberLimit',
      validation.checkExist(),
      validation.checkParsedNumberInRange(2, 8),
    )
    validation.check(
      roundCount,
      'roundCount',
      validation.checkExist(),
      validation.checkParsedNumberInRange(1, 8),
    )
    if (
      !(
        Number(roundTimeLimit) === 150 ||
        Number(roundTimeLimit) === 120 ||
        Number(roundTimeLimit) === 90 ||
        Number(roundTimeLimit) === 60
      )
    ) {
      throw {
        statusCode: 400,
        message:
          'roundTimeLimist는 150또는 120또는 90또는 60의 값을 가진 정수여야합니다',
      }
    }
  } catch (err) {
    console.log(err)
    return {
      isValid: false,
      message: '잘못된 설정 값이 입력되었습니다',
    }
  }
  return {
    isValid: true,
  }
}

export const getGameRoomId = (socketId) => clientGameRoomId[socketId]

export const getUserInfo = (gameRoomId, socketId) => {
  const members = gameRooms[gameRoomId].members

  // 이미 유저 정보가 그 게임방에 존재
  if (members[socketId]) {
    return members[socketId]
  }

  // 유저 정보가 그 게임방에 존재하지 않음 : 새로 만들기
  const randomIndex = Math.floor(Math.random() * 8)
  const userInfo = (members[socketId] = {
    id: socketId,
    nickname: nickname[randomIndex],
    level: 1,
    isCaptain: false,
    isReady: false,
  })

  return userInfo
}

export const changePlayerReadyState = (socket) => {
  const gameRoomId = clientGameRoomId[socket.id]
  const curRedayState = getUserInfo(gameRoomId, socket.id).isReady
  getUserInfo(gameRoomId, socket.id).isReady = !curRedayState
}

export const changeGameRoomUserInfo = (socket, changeFunction) => {
  const gameRoomIdToChange = clientGameRoomId[socket.id]
  changeFunction(socket)
  gameRooms[gameRoomIdToChange].members[socket.id] = getUserInfo(
    gameRoomIdToChange,
    socket.id,
  )
  return gameRoomIdToChange
}

export const createRoom = (socket, newGameRoomSetting) => {
  const gameRoomId = uuid.v4()
  clientGameRoomId[socket.id] = gameRoomId

  const { title, password, memberLimit, roundCount, roundTimeLimit } =
    newGameRoomSetting

  const isPasswordRoom = password !== '' ? true : false

  gameRooms[gameRoomId] = {
    isPasswordRoom,
    isInGame: false,
    title,
    memberCount: 1,
    memberLimit,
    roundCount,
    roundTimeLimit,
    members: {},
  }

  // 유저 정보를 불러옴
  const userInfo = getUserInfo(gameRoomId, socket.id)
  // 방 만들었으니 방장
  userInfo.isCaptain = true

  gameRoomPasswords[gameRoomId] = password

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

  return {
    gameRoomId,
    gameRoomInfo,
    gameEnteranceInfo,
  }
}

export const validateJoinTicket = (joinTicket) => {
  const { gameRoomId, password } = joinTicket

  const { isPasswordRoom, isInGame, memberCount, memberLimit } =
    gameRooms[gameRoomId] ?? {}

  if (memberCount === undefined) {
    return {
      isValid: false,
      message: '존재하지 않는 방입니다',
    }
  }
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
  getUserInfo(gameRoomId, socket.id)
  clientGameRoomId[socket.id] = gameRoomId
  gameRooms[gameRoomId].memberCount++
}

export const leaveGameRoom = (socket) => {
  const socketId = socket.id

  const gameRoomIdToLeave = clientGameRoomId[socketId]
  if (gameRoomIdToLeave === undefined) return {}

  delete clientGameRoomId[socketId]

  const gameRoomToLeave = gameRooms[gameRoomIdToLeave]
  const isCaptain = gameRoomToLeave.members[socketId].isCaptain
  delete gameRoomToLeave.members[socketId]

  const curRoomMeberCount = --gameRoomToLeave.memberCount

  if (curRoomMeberCount === 0) {
    delete gameRooms[gameRoomIdToLeave]
    delete gameRoomPasswords[gameRoomIdToLeave]
  }

  return {
    curRoomMeberCount,
    gameRoomIdToLeave,
    isCaptain,
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
  if (getUserInfo(gameRoomId, socket.id).isCaptain === false) {
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

export const changeCaptain = (gameRoomId) => {
  const curMembers = gameRooms[gameRoomId].members
  const firstKey = Object.keys(curMembers)[0]
  curMembers[firstKey].isCaptain = true
  return firstKey
}
