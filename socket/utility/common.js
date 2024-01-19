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

export const getUserInfo = (socket) => {
  const randomIndex = Math.floor(Math.random() * 8)
  socket.userInfo = {
    id: uuid.v4(),
    nickname: nickname[randomIndex],
    level: 1,
    isCaptain: false,
    isReady: false,
  }
}
