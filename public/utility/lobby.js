const drawGameEnterance = (targetGameRoom, gameRoomInfo) => {
  targetGameRoom.innerHTML = ''
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

  const numberContain = document.createElement('div')
  numberContain.innerHTML = '1'
  numberContain.className = 'enteracneNumber'

  const titleContain = document.createElement('div')
  titleContain.textContent = title
  titleContain.className = 'enteracneTitle'

  const infoContain = document.createElement('div')
  infoContain.textContent = `${roundCount}라운드 | ${roundTimeLimit}초`
  infoContain.className = 'enteracneInfo'

  const titleAndInfo = document.createElement('div')
  titleAndInfo.className = 'enteracneTitleAndInfo'

  titleAndInfo.appendChild(titleContain)
  titleAndInfo.appendChild(infoContain)

  const memberInfoContain = document.createElement('div')
  memberInfoContain.innerHTML = `${memberCount}/${memberLimit}`
  memberInfoContain.className = 'enteracneMemberInfo'

  const passwordRoomInfoContain = document.createElement('div')
  console.log(isPasswordRoom)
  if (isPasswordRoom === false) {
    passwordRoomInfoContain.innerHTML = `<svg width="35" height="30" viewBox="0 0 35 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clip-path="url(#clip0_850_5462)">
    <path d="M35 9.42308V14.8077C35 15.1723 34.8668 15.4878 34.6004 15.7542C34.3339 16.0206 34.0184 16.1538 33.6538 16.1538H32.3077C31.9431 16.1538 31.6276 16.0206 31.3612 15.7542C31.0948 15.4878 30.9615 15.1723 30.9615 14.8077V9.42308C30.9615 7.9367 30.4357 6.66767 29.384 5.61598C28.3323 4.5643 27.0633 4.03846 25.5769 4.03846C24.0905 4.03846 22.8215 4.5643 21.7698 5.61598C20.7181 6.66767 20.1923 7.9367 20.1923 9.42308V13.4615H22.2115C22.7724 13.4615 23.2492 13.6579 23.6418 14.0505C24.0345 14.4431 24.2308 14.9199 24.2308 15.4808V27.5962C24.2308 28.157 24.0345 28.6338 23.6418 29.0264C23.2492 29.4191 22.7724 29.6154 22.2115 29.6154H2.01923C1.45833 29.6154 0.98157 29.4191 0.588942 29.0264C0.196314 28.6338 0 28.157 0 27.5962V15.4808C0 14.9199 0.196314 14.4431 0.588942 14.0505C0.98157 13.6579 1.45833 13.4615 2.01923 13.4615H16.1538V9.42308C16.1538 6.82893 17.0758 4.60988 18.9198 2.76593C20.7637 0.921975 22.9828 0 25.5769 0C28.1711 0 30.3901 0.921975 32.2341 2.76593C34.078 4.60988 35 6.82893 35 9.42308Z" fill="black" fill-opacity="0.9"/>
    </g>
    <defs>
    <clipPath id="clip0_850_5462">
    <rect width="35" height="29.6154" fill="white"/>
    </clipPath>
    </defs>
    </svg>`
  } else {
    passwordRoomInfoContain.innerHTML = `<svg width="24" height="29" viewBox="0 0 24 29" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clip-path="url(#clip0_850_5287)">
    <path d="M21.4286 12.6875H20.1429V8.60938C20.1429 3.86289 16.4893 0 12 0C7.51071 0 3.85714 3.86289 3.85714 8.60938V12.6875H2.57143C1.15179 12.6875 0 13.9053 0 15.4062V26.2812C0 27.7822 1.15179 29 2.57143 29H21.4286C22.8482 29 24 27.7822 24 26.2812V15.4062C24 13.9053 22.8482 12.6875 21.4286 12.6875ZM15.8571 12.6875H8.14286V8.60938C8.14286 6.36074 9.87321 4.53125 12 4.53125C14.1268 4.53125 15.8571 6.36074 15.8571 8.60938V12.6875Z" fill="#010101"/>
    </g>
    <defs>
    <clipPath id="clip0_850_5287">
    <rect width="24" height="29" fill="white"/>
    </clipPath>
    </defs>
    </svg>`
  }
  passwordRoomInfoContain.className = 'enteracneisPasswordRoomInfo'

  const memberAndIsPasswordRoom = document.createElement('div')
  memberAndIsPasswordRoom.className = 'enteracneMemberAndIsPasswordRoom'

  memberAndIsPasswordRoom.appendChild(memberInfoContain)
  memberAndIsPasswordRoom.appendChild(passwordRoomInfoContain)

  targetGameRoom.appendChild(numberContain)
  targetGameRoom.appendChild(titleAndInfo)
  targetGameRoom.appendChild(memberAndIsPasswordRoom)

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
    gameEnterance.className = 'gameRoomEnterance'
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
  newGameEnterance.className = 'gameRoomEnterance'
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

const drawMyInfoInLobby = (userInfo) => {
  document.getElementById('myCharacter').innerHTML = `
    <svg
      width="95"
      height="84"
      viewBox="0 0 95 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
    >
      <rect width="95" height="83.9732" fill="url(#pattern0)" />
      <defs>
        <pattern
          id="pattern0"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlink:href="#image0_850_3409"
            transform="scale(0.00446429 0.00505051)"
          />
        </pattern>
        <image
          id="image0_850_3409"
          width="224"
          height="198"
          xlink:href="data:image/png;base64,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"
        />
      </defs>
    </svg>
  `
  document.getElementById('myNickname').innerHTML = userInfo.nickname
  document.getElementById('myLevel').innerHTML = `레벨 ${userInfo.level}`
}
