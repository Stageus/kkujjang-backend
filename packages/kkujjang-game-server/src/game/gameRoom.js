import * as uuid from 'uuid'
import { configDotenv } from 'dotenv'
import { Game } from '#game/game'
import * as validation from '#utility/validation'

configDotenv()

export class GameRoom {
  /**
   * @type {number}
   */
  #roomNumber

  get roomNumber() {
    return this.#roomNumber
  }

  /**
   * @type {string}
   */
  #id

  /**
   * @returns {string}
   */
  get id() {
    return this.#id
  }
  /**
   * @type {string}
   */
  #title

  /**
   * @type {Game | null}
   */
  #game = null

  /**
   * @type {'preparing' | 'playing' | 'destroyed'}
   */
  state

  /**
   * @type {boolean}
   */
  isSecure

  /**
   * @type {string}
   */
  #password

  /**
   * @type {number}
   */
  #maxUserCount = 0

  /**
   * @type {{
   *   userId: number,
   *   isReady: boolean,
   * }[]}
   */
  #userlist = []

  get currentUserCount() {
    return this.#userlist.length
  }

  /**
   * @type {number}
   */
  #roomOwnerUserIndex
  get roomOwnerUserId() {
    return this.#userlist[this.#roomOwnerUserIndex].userId
  }

  /**
   * @type {number}
   */
  #maxRound

  /**
   * @type {number}
   */
  #roundTimeLimit

  /**
   * @param {{
   *   title: string;
   *   password?: string;
   *   maxUserCount: number;
   *   maxRound: number,
   *   roundTimeLimit: number,
   * }} roomConfig
   */
  validateRoomconfig({
    title,
    password,
    maxUserCount,
    maxRound,
    roundTimeLimit,
  }) {
    try {
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
        maxUserCount,
        'maxUserCount',
        validation.checkExist(),
        validation.checkParsedNumberInRange(2, 8),
      )
      validation.check(
        maxRound,
        'maxRound',
        validation.checkExist(),
        validation.checkParsedNumberInRange(1, 8),
      )
      validation.check(
        Number(roundTimeLimit),
        'roundTimeLimit',
        validation.checkExist(),
        validation.checkMatchedWithElements([150000, 120000, 90000, 60000]),
      )
    } catch (e) {
      throw {
        type: 'invalidRoomConfigData',
        message: e.message,
      }
    }
  }

  /**
   * @param {{
   *   title: string;
   *   password?: string;
   *   maxUserCount: number;
   *   roomOwnerUserId: number;
   *   maxRound: number,
   *   roundTimeLimit: number,
   * }} roomConfig
   */
  constructor({
    title,
    password = null,
    maxUserCount,
    roomOwnerUserId,
    maxRound,
    roundTimeLimit,
  }) {
    this.validateRoomconfig({
      title,
      password,
      maxUserCount,
      maxRound,
      roundTimeLimit,
    })

    this.#id = uuid.v4()
    this.#title = title
    this.#maxUserCount = maxUserCount
    this.#roomOwnerUserIndex = 0
    this.#maxRound = maxRound
    this.#roundTimeLimit = roundTimeLimit
    this.state = 'preparing'

    if (password === '') {
      this.#password = password
      this.isSecure = false
    } else {
      this.#password = password
      this.isSecure = true
    }

    this.#userlist.push({ userId: roomOwnerUserId, isReady: false })
  }

  get info() {
    return {
      roomNumber: this.roomNumber,
      id: this.id,
      title: this.#title,
      state: this.state,
      isSecure: this.isSecure,
      maxUserCount: this.#maxUserCount,
      currentUserCount: this.#userlist.length,
    }
  }

  get fullInfo() {
    return {
      ...this.info,
      userList: this.#userlist,
      maxRound: this.#maxRound,
      roundTimeLimit: this.#roundTimeLimit,
      roomOwnerUserId: this.#userlist[this.#roomOwnerUserIndex].userId,
    }
  }

  /**/
  /* 로비 */
  /**/

  setRoomNumber(roomNumber) {
    this.#roomNumber = roomNumber
  }

  /**/
  /* 대기실 */
  /**/

  changeRoomConfig({
    title,
    password,
    maxUserCount,
    maxRound,
    roundTimeLimit,
  }) {
    this.validateRoomconfig({
      title,
      password,
      maxUserCount,
      maxRound,
      roundTimeLimit,
    })

    if (maxUserCount < this.#userlist.length) {
      throw {
        type: 'changeOverCurrentUserCount',
      }
    }
    this.#title = title
    this.#maxUserCount = maxUserCount
    this.#maxRound = maxRound
    this.#roundTimeLimit = roundTimeLimit
    this.state = 'preparing'

    if (password === '') {
      this.#password = password
      this.isSecure = false
    } else {
      this.#password = password
      this.isSecure = true
    }
  }

  /**
   * @param {number} occurerUserId
   * @param {{
   *   onTimerTick: (roomId: string,timeStatus: {
   *     roundTimeLeft: number;
   *     personalTimeLeft: number;
   *   }) => void
   *   onTurnEnd: (roomId: string) => void
   *   onRoundEnd: (roomId: string, roundResult: {
   *     defeatedUserIndex: number;
   *     scoreDelta: number;
   *   }) => void
   *   onGameEnd: (roomId: string, ranking: {
   *     userId: number;
   *     score: number;
   *   }[]) => void
   * }} callbacks
   * @returns {Promise<boolean | null>} 방장이 아니거나 시작할 수 없을 경우 `null` 반환, 시작 시 방 ID 반환
   */
  async startGame(
    occurerUserId,
    { onTimerTick, onTurnEnd, onRoundEnd, onGameEnd },
  ) {
    if (
      this.#userlist[this.#roomOwnerUserIndex].userId !== occurerUserId ||
      !this.#canStartGame()
    ) {
      return null
    }

    this.state = 'playing'
    this.#game = new Game()
    await this.#game.initializeGame(
      this.#userlist.map(({ userId }) => userId),
      this.#maxRound,
      {
        onTimerTick: () => onTimerTick(this.#id, this.#game.timeStatusForTimer),
        onTurnEnd: () => onTurnEnd(this.#id),
        /**
         * @param {{
         *   defeatedUserIndex: number;
         *   scoreDelta: number;
         * }} roundResult
         */
        onRoundEnd: (roundResult) => onRoundEnd(this.#id, roundResult),
        onGameEnd: () => {
          this.state = 'preparing'
          onGameEnd(this.#id, this.#game.ranking)
          this.#game = null
        },
      },
    )

    return true
  }

  /**
   * @returns {boolean}
   */
  #canStartGame() {
    return (
      this.state === 'preparing' &&
      this.#userlist.filter(
        (user, index) =>
          index !== this.#roomOwnerUserIndex && user.isReady === false,
      ).length === 0
    )
  }

  /**
   * @returns {number} 사용자 인덱스 반환 (n번째 사용자의 n, n은 0 ~ {인원 - 1})
   */
  setNewRoomOwner() {
    this.resetReadyState()

    const index = Math.floor(Math.random() * (this.#userlist.length - 1))
    this.#roomOwnerUserIndex = index

    return index
  }

  resetReadyState() {
    this.#userlist = this.#userlist.map(({ userId }) => ({
      userId,
      isReady: false,
    }))
  }

  /**
   * @param {number} userId
   * @param {boolean} state
   * @returns {number} 준비 여부 변경 적용된 사용자의 인덱스 반환
   */
  switchReadyState(userId, state) {
    /**
     * @type {number}
     */
    let changedIndex = null

    this.#userlist = this.#userlist.map((user, index) => {
      if (user.userId === userId) {
        changedIndex = index

        return {
          userId,
          isReady: state,
        }
      } else {
        return {
          userId: user.userId,
          isReady: user.isReady,
        }
      }
    })

    return changedIndex
  }

  /**/
  /* 인게임 */
  /**/

  /**
   * @param {number} occurerUserId
   */
  startRound(occurerUserId) {
    if (
      this.#userlist[this.#roomOwnerUserIndex].userId !== occurerUserId ||
      this.#game.state !== 'game ready'
    ) {
      return null
    }

    this.#game.initializeRound()

    return true
  }

  /**
   * @param {number} occurerUserId
   */
  startTurn(occurerUserId) {
    if (
      !this.#game.isTurnOf(occurerUserId) ||
      this.#game.state !== 'round ready'
    ) {
      return null
    }

    this.#game.startTimer(this.#roundTimeLimit)

    this.#game.initializeTurn()

    return true
  }

  /**
   * @returns {{
   *   userId: number;
   *   score: number;
   * }[]}
   */
  get ranking() {
    return this.#game.ranking
  }

  /**
   * @param {number} userId
   * @param {string} password default `null`
   * @throws {{
   *   error: string
   * }}
   */
  tryJoin(userId, password = null) {
    if (this.#password !== null && this.#password !== password) {
      throw {
        error: 'wrong password',
      }
    }

    if (this.#maxUserCount <= this.currentUserCount) {
      throw {
        error: 'full room',
      }
    }

    this.#userlist.push({ userId, isReady: false })
  }

  /**
   * @param {number} userId
   */
  delUser(userId) {
    this.#userlist = this.#userlist.filter((user) => user.userId !== userId)

    if (this.#game !== null) {
      this.#game.delUser(userId)
    }
  }

  get currentGameStatus() {
    if (this.state !== 'playing') {
      return null
    }

    return this.#game.status
  }

  /**
   * @param {string | null} word
   */
  async sayWord(word) {
    if (this.#game.state !== 'turn proceeding') return null

    return await this.#game.checkIsValidWord(word)
  }
}
