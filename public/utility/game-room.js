const addGameRoomMember = (userInfo) => {
  var div = document.createElement('div')
  div.id = `user${userInfo.id}`
  div.innerHTML = userInfo.nickname
  member.appendChild(div)
}

const removeGameRoomMember = (userId) => {
  document.getElementById(`user${userId}`).remove()
}

const changeMemberState = (userInfo) => {
  const div = document.createElement('div')
  div.id = `user${userInfo.id}`
  div.innerHTML = userInfo.nickname
  member.appendChild(div)
}

const changeRoomSetting = (gameRoomInfo) => {}

const drawGameRoom = (roomInfoJson) => {
  // 방 그리기
  gameRoomContain.innerHTML = `
        <div id="gameRoom">
          <button onclick="editGameRoomSettingEvent()">방 설정</button>
          <button onclick="tryStartGameEvent()">시작</button>
          <button onclick="changePlayerReadyStateEvent()">준비</button>
          <button onclick="leaveGameRoom()">나가기</button>
          <h2>${roomInfoJson.title}</h2>
          <div id="member">
          </div>
        </div>`

  // 현존 멤버들 그리기
  const roomMembers = roomInfoJson.members
  for (const roomMember of roomMembers) {
    const div = document.createElement('div')
    div.id = `user${roomMember.id}`
    div.innerHTML = roomMember.nickname
    member.appendChild(div)
  }
}

const drawInGame = (gameRoomInfo) => {
  console.log(gameRoomInfo)
}
