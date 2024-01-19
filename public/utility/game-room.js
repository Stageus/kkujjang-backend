// 들어온 유저 그리기
const addGameRoomMember = (userInfo) => {
  var div = document.createElement('div')
  div.id = `user${userInfo.id}`
  div.innerHTML = userInfo.nickname
  member.appendChild(div)
}

// 나간 유저 지우기
const removeGameRoomMember = (userId) => {
  document.getElementById(`user${userId}`).remove()
}

// 참가 유저 상태 바꾸기
const changeMemberState = (userInfo) => {
  const targetMember = document.getElementById(`user${userInfo.id}`)
  targetMember.innerHTML = userInfo.nickname
}

// 방 설정 바꾸기
const changeRoomSetting = (gameRoomInfo) => {
  console.log(gameRoomInfo)
}

// 인게임 화면 그리기
const drawInGame = (gameRoomInfo) => {
  console.log(gameRoomInfo)
}

// 방 그리기
const drawGameRoom = (gameRoomInfo) => {
  gameRoomContain.innerHTML = `
        <div id="gameRoom">
          <button onclick="editGameRoomSettingEvent()">방 설정</button>
          <button onclick="tryStartGameEvent()">시작</button>
          <button onclick="changePlayerReadyStateEvent()">준비</button>
          <button onclick="leaveGameRoom()">나가기</button>
          <h2>${gameRoomInfo.title}</h2>
          <div id="member">
          </div>
        </div>`

  // 룸에 있던 멤버들 그리기
  const roomMembers = gameRoomInfo.members
  for (const roomMember of roomMembers) {
    const div = document.createElement('div')
    div.id = `user${roomMember.id}`
    div.innerHTML = roomMember.nickname
    member.appendChild(div)
  }
}
