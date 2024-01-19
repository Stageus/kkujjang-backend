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
    }</div>
  `

  targetGameRoom.style.backgroundColor = 'gray'
  targetGameRoom.style.width = '500px'

  // 게임방 입구 클릭  이벤트 리스너 등록
  targetGameRoom.addEventListener('click', (event) => {
    if (event.target.classList.contains('click')) {
      return
    }
    const targetElement = event.target // 클릭된 요소
    let currentElement = targetElement

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

    const gameRoomId = currentElement.id
    const joinTicket = {
      isGameRoomCreate: false,
      gameRoomTicket: {
        gameRoomId,
        password: '',
      },
    }

    if (currentElement.getAttribute('data-isPasswordRoom') === 'true') {
      const password = prompt('비밀번호를 입력해주세요')
      joinTicket.gameRoomTicket.password = password
    }

    // 해당 roomId에 접속을 시도
    connectToGameRoomSocket(joinTicket)
  })
}

const promptGameRoomSetting = () => {
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
    return {
      isValid: false,
    }
  }

  return {
    isValid: true,
    gameRoomSetting: {
      title,
      password,
      memberLimit,
      roundCount,
      roundTimeLimit,
    },
  }
}

const drawGameEnteranceList = (gameRooms) => {
  gameEnteranceContain.innerHTML = ''
  for (const gameRoomId in gameRooms) {
    const gameRoomInfo = gameRooms[gameRoomId]

    const gameEnterance = document.createElement('div')
    gameEnterance.id = gameRoomId

    drawGameEnterance(gameEnterance, gameRoomInfo)
    gameEnteranceContain.insertBefore(
      gameEnterance,
      gameEnteranceContain.firstChild,
    )
  }
}

const addGameEnterance = (gameRoomInfoWithId) => {
  const { gameRoomId, gameRoomInfo } = gameRoomInfoWithId
  const newGameEnterance = document.createElement('div')
  newGameEnterance.id = gameRoomId
  drawGameEnterance(newGameEnterance, gameRoomInfo)
  gameEnteranceContain.insertBefore(
    newGameEnterance,
    gameEnteranceContain.firstChild,
  )
}

const refreshGameEnterance = (gameRoomInfoWithId) => {
  const { gameRoomId, gameRoomInfo } = gameRoomInfoWithId

  const targetGameRoom = document.getElementById(gameRoomId)
  drawGameEnterance(targetGameRoom, gameRoomInfo)
}
