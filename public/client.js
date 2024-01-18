var socket

form.addEventListener('submit', (event) => {
  event.preventDefault()
  var input = document.getElementById('input')
  socket.emit('chat', input.value)
  input.value = ''
})

// 로비 소켓, 룸 소켓 공용 채팅 이벤트 리스너
const addChatEventListener = () => {
  socket.on('chat', (msg) => {
    var messages = document.getElementById('messages')
    var li = document.createElement('li')
    li.textContent = msg
    messages.appendChild(li)
    messages.scrollTop = messages.scrollHeight
  })
}

//==================== 룸 ====================//
// 룸 소켓 용 함수

// add game room member 이벤트가 발생하면 추가된 멤버를 그림
const addGameRoomMember = (userInfo) => {
  var div = document.createElement('div')
  div.id = `user${userInfo.id}`
  div.innerHTML = userInfo.nickname
  member.appendChild(div)
}

// remove game room membe 이벤트가 발생하면 나간 멤버를 그림
const removeGameRoomMember = (userId) => {
  document.getElementById(`user${userId}`).remove()
}

// change member state 이벤트가 발생하면 그 멤버의 상태를 갱신함
// const changeMemberState = (userInfo) => {
//   var div = document.createElement('div')
//   div.id = `user${userInfo.id}`
//   div.innerHTML = userInfo.nickname
//   member.appendChild(div)
// }

// change game room setting 이벤트가 발생하면 방 설정을 갱신해줌
// const changeRoomSetting = (gameRoomInfo) => {
// }

// 방 갱신이 됐을 때 발생하는 이벤트 리스너들을 등록함
const addRefreshRoomEventListener = () => {
  // 어떤 플레이어가 들어옴
  socket.on('add game room member', (userInfo) => {
    addGameRoomMember(JSON.parse(userInfo))
  })
  // 어떤 플레이어가 나감
  socket.on('remove game room member', (userId) => {
    removeGameRoomMember(userId)
  })
  // 어떤 멤버의 상태가 바뀜
  socket.on('change member state', (userInfo) => {
    // changeMemberState(userInfo)
  })
  // 방 설정이 바뀜
  socket.on('change game room setting', (userInfo) => {
    // changeRoomSetting(userInfo)
  })
}

// 방 설정을 변경하는 창을 띄우는 이벤트를 발생시키는 함수
const editGameRoomSettingEvent = () => {
  const title = prompt('방 제목을 입력해주세요')
  const password = prompt('비밀번호는 뭐죠')
  const memberLimit = prompt('인원수 제한은 몇명인가요')
  const roundCount = prompt('몇 라운드인가요')
  const roundTimeLimit = prompt('라운드 시간은 어떻게 되죠?')
}

// 게임 시작을 시도하는 이벤트를 발생시키는 함수
const tryStartGameEvent = () => {
  socket.emit('try start game')
}

// 레디 상태를 변화시키는 이벤트를 발생시키는 함수
const changePlayerReadyStateEvent = () => {
  socket.emit('change player ready state')
}

// 나가기 버튼을 누르면 방을 나감
const leaveGameRoom = () => {
  socket.disconnect()
  gameRoomContain.innerHTML = ''
  accessToLobbySocket()
}

// const drawInGame = (gameRoomInfo) => {
//
// }

// // 게임 시작 이벤트 발생 시 처리해주는 함수
// socket.on('start game', (gameRoomInfo) => {
//   drawInGame(gameRoomInfo)
// })

// 최초 접속 시 서버에서 draw game room 이벤트를 발생시켜서 주어진 정보를 바탕으로 룸을 그림
const addDrawGameRoomEventListener = () => {
  socket.on('draw game room', (gameRoomInfo) => {
    const roomInfoJson = JSON.parse(gameRoomInfo)
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
    for (roomMember of roomMembers) {
      var div = document.createElement('div')
      div.id = `user${roomMember.id}`
      div.innerHTML = roomMember.nickname
      member.appendChild(div)
    }
  })
}
// 룸 소켓 용 함수 끝

// 룸 소켓에 접속을 시도
const accessToGameRoomSocket = (accessType) => {
  socket = io('http://localhost:3000/gameRoom')

  const { isGameRoomCreate, gameRoomInfo } = accessType
  //  isGameRoomCreate가 true라면 새 방을 만드는 것임
  const emitMsg =
    isGameRoomCreate === true ? 'create game room' : 'try join game room'

  socket.on('connect', () => {
    socket.emit(emitMsg, gameRoomInfo)
    addChatEventListener()
    addRefreshRoomEventListener()
    addDrawGameRoomEventListener()
  })

  // 룸에 접속을 시도했는데 실패함
  socket.on('fail join game room', (msg) => {
    alert(msg)
  })

  socket.on('disconnect', () => {
    socket = io('http://localhost:3000/lobby')
  })
}

//==================== 로비 ====================//
// 로비 용 함수
// 방 만들기를 누르면 방을 만듬
const createGameRoom = () => {
  const title = prompt('방 제목을 입력해주세요')
  const password = prompt('비밀번호는 뭐죠')
  const memberLimit = Number(prompt('인원수 제한은 몇명인가요'))
  const roundCount = Number(prompt('몇 라운드인가요'))
  const roundTimeLimit = Number(prompt('라운드 시간은 어떻게 되죠?'))

  if (
    title === null ||
    memberLimit === null ||
    roundCount === null ||
    roundTimeLimit === null
  ) {
    return
  }

  socket.disconnect()
  accessToGameRoomSocket({
    isGameRoomCreate: true,
    gameRoomInfo: {
      title,
      password,
      memberLimit,
      roundCount,
      roundTimeLimit,
    },
  })
}

// 로비에 게임방 입구를 그림
const drawGameEnterance = (targetGameRoom, gameRoomInfo) => {
  const {
    isPasswordRoom,
    isInGame,
    title,
    roundCount,
    memberCount,
    memberLimit,
    roundTimeLimit,
  } = gameRoomInfo

  const isFull = memberLimit <= memberCount

  targetGameRoom.setAttribute('data-isFull', isFull.toString())
  targetGameRoom.setAttribute('data-isInGame', isInGame.toString())
  targetGameRoom.setAttribute('data-isPasswordRoom', isPasswordRoom.toString())

  targetGameRoom.innerHTML = `
            <div>${title}</div>
            <div>${roundCount}라운드 | ${roundTimeLimit}초 | ${memberCount}/${memberLimit} | ${
              isPasswordRoom ? '비밀방' : '열린방'
            }</div>`

  targetGameRoom.style.backgroundColor = 'gray'
  targetGameRoom.style.width = '500px'
}
// 로비 용 함수 끝

// 로비 소켓에 연결과 연결됐을때 이벤트리스너 세팅
const accessToLobbySocket = () => {
  socket = io('http://localhost:3000/lobby')

  // 채팅 이벤트리스너를 등록함
  addChatEventListener()

  // 로비 연결시에 게임방을 로딩함
  socket.on('load game room', (gameRooms) => {
    var gameRoomList = document.getElementById('gameRoomList')
    gameRoomList.innerHTML = ''
    const gameRoomsJson = JSON.parse(gameRooms)
    for (const gameRoomId in gameRoomsJson) {
      const gameRoomInfo = gameRoomsJson[gameRoomId]
      var loadedGameRoom = document.createElement('div')
      loadedGameRoom.id = gameRoomId
      drawGameEnterance(loadedGameRoom, gameRoomInfo)
      gameRoomList.insertBefore(loadedGameRoom, gameRoomList.firstChild)
    }
  })

  // 새로운 룸이 생성됨
  socket.on('new game room', (roomInfoWithId) => {
    const gameRoomWithIdJson = JSON.parse(roomInfoWithId)
    const { gameRoomId, gameRoomInfo } = gameRoomWithIdJson

    var gameRoomList = document.getElementById('gameRoomList')
    var newGameRoom = document.createElement('div')
    newGameRoom.id = gameRoomId
    drawGameEnterance(newGameRoom, gameRoomInfo)
    gameRoomList.insertBefore(newGameRoom, gameRoomList.firstChild)

    // 룸 입구 클릭 시 이벤트 리스너 등록
    newGameRoom.addEventListener('click', (event) => {
      var targetElement = event.target // 클릭된 요소
      var currentElement = targetElement

      // 최상위 입구 요소를 찾는다
      while (currentElement) {
        if (currentElement.getAttribute('data-ispasswordroom') !== null) {
          break
        }
        currentElement = currentElement.parentNode // 부모 요소로 이동
      }
      // 최상위 입구 요소를 찾는다 끝

      if (currentElement.getAttribute('data-isFull') === 'true') {
        alert('이미 풀방입니다')
        return
      }

      if (currentElement.getAttribute('data-isInGame') === 'true') {
        alert('게임이 진행 중인 방입니다')
        return
      }

      const roomId = currentElement.id
      const joinTicket = {
        isGameRoomCreate: false,
        gameRoomInfo: {
          gameRoomId,
          password: '',
        },
      }

      if (currentElement.getAttribute('data-isPasswordRoom') === 'true') {
        const password = prompt('비밀번호를 입력해주세요')
        joinTicket.gameRoomInfo.password = password
      }

      // 해당 roomId에 접속을 시도
      accessToGameRoomSocket(joinTicket)
    })
  })

  // 어떤 룸의 정보가 바뀜
  socket.on('refresh game room', (roomInfoWithId) => {
    const gameRoomWithIdJson = JSON.parse(roomInfoWithId)
    const { gameRoomId, gameRoomInfo } = gameRoomWithIdJson

    const targetGameRoom = document.getElementById(gameRoomId)
    drawGameEnterance(targetGameRoom, gameRoomInfo)
  })

  // 참가자수가 0이 되어서 룸이 지워짐
  socket.on('remove game room', (roomId) => {
    document.getElementById(roomId).remove()
  })
}

accessToLobbySocket()
