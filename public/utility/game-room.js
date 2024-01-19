// 들어온 유저 그리기
const addGameRoomMember = (userInfo) => {
  const { id, level, nickname } = userInfo
  var div = document.createElement('div')
  div.id = `user${id}`
  div.className = 'member'
  div.innerHTML = `${level}레벨 | ${nickname} | 대기`
  member.appendChild(div)
}

// 나간 유저 지우기
const removeGameRoomMember = (userId) => {
  document.getElementById(`user${userId}`).remove()
}

// 참가 유저 상태 바꾸기
const changeMemberState = (userInfo) => {
  const { id, level, nickname, redayState } = userInfo
  const readyMessage = redayState === true ? '준비' : '대기'
  const targetMember = document.getElementById(`user${id}`)
  targetMember.innerHTML = `${level}레벨 | ${nickname} | ${readyMessage}`
}

// 방 설정 바꾸기
const changeGameRoomSetting = (gameRoomInfo) => {
  const { title, isPasswordRoom, memberLimit, roundCount, roundTimeLimit } =
    gameRoomInfo
  gameRoomTitle.innerHTML = title
  gameRoom.setAttribute('data-isPasswordRoom', isPasswordRoom.toString())
  gameRoomSettingContain.innerHTML = `${memberLimit}명 | ${roundCount}라운드 | ${roundTimeLimit}초 |`
}

// 인게임 화면 그리기
const drawInGame = (gameRoomInfo) => {
  console.log(gameRoomInfo)
}

// 방 그리기
const drawGameRoom = (gameRoomInfo) => {
  const { title, memberLimit, roundCount, roundTimeLimit, members } =
    gameRoomInfo
  gameRoomContain.innerHTML = `
        <div id="gameRoom">
          <button onclick="tryChangeGameRoomSettingEvent()">방 설정</button>
          <button onclick="tryStartGameEvent()">시작</button>
          <button onclick="changePlayerReadyStateEvent()">준비</button>
          <button onclick="leaveGameRoom()">나가기</button>
          <span id = "gameRoomSettingContain">${memberLimit}명 | ${roundCount}라운드 | ${roundTimeLimit}초 |</span>
          <h2 id = "gameRoomTitle">${title}</h2>
          <div id="member">
          </div>
        </div>`

  // 룸에 있던 멤버들 그리기
  const roomMembers = members
  for (const roomMember of roomMembers) {
    addGameRoomMember(roomMember)
  }
}
