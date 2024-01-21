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
  // 유저 정보가 그 게임방에 존재하지 않음 : 새로 만들기
  const randomIndex = Math.floor(Math.random() * 8)
  socket.userInfo = {
    id: socket.id,
    nickname: nickname[randomIndex],
    level: 1,
    isCaptain: false,
    isReady: false,
  }
}
