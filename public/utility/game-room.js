const addBtn = (buttonId) => {
  const btn = document.getElementById(buttonId)
  btn.style.display = 'inline'
}

const removeBtn = (buttonId) => {
  const btn = document.getElementById(buttonId)
  btn.style.display = 'none'
}

// 들어온 유저 그리기
const addGameRoomMember = (userInfo) => {
  const { id, level, nickname, isCaptain, isReady } = userInfo
  const targetMember = document.createElement('div')
  targetMember.id = `user${id}`
  targetMember.className = 'member'
  const userState =
    isCaptain === true ? '방장' : isReady === true ? '준비' : '대기'
  targetMember.innerHTML = `${level}레벨 | ${nickname} | ${userState}`
  member.appendChild(targetMember)
}

// 나간 유저 지우기
const removeGameRoomMember = (userId) => {
  document.getElementById(`user${userId}`).remove()
}

// 참가 유저 상태 바꾸기
const refreshGameRoomMember = (userInfo) => {
  const { id, level, nickname, isCaptain, isReady } = userInfo
  const userState =
    isCaptain === true ? '방장' : isReady === true ? '준비' : '대기'
  const targetMember = document.getElementById(`user${id}`)
  targetMember.innerHTML = `${level}레벨 | ${nickname} | ${userState}`
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
          <button id = "changeGameRoomSettingBtn" onclick="tryChangeGameRoomSettingEvent()">방 설정</button>
          <button id = "startBtn" onclick="tryStartGameEvent()">시작</button>
          <button id="readyBtn" onclick="tryChangePlayerReadyStateEvent()">준비</button>
          <button onclick="leaveGameRoom()">나가기</button>
          <span id = "gameRoomSettingContain">${memberLimit}명 | ${roundCount}라운드 | ${roundTimeLimit}초 |</span>
          <h2 id = "gameRoomTitle">${title}</h2>
          <div id="member">
          </div>
        </div>`

  // 게임방에 있던 멤버들 그리기
  const roomMembers = members
  for (const roomMember of roomMembers) {
    addGameRoomMember(roomMember)
  }
}
