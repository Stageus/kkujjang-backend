import * as uuid from 'uuid'
import { Game } from './game'
import { configDotenv } from 'dotenv'

configDotenv()

export class Room {
  /**
   * @type {string}
   */
  #id

  /**
   * @type {string}
   */
  #title

  /**
   * @type {Game | null}
   */
  #gameStatus = null

  /**
   * @type {'preparing' | 'playing'}
   */
  #state = 'preparing'

  /**
   * @type {boolean}
   */
  #isSecure

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

  /**
   * @type {number}
   */
  #roomOwnerUserIndex

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
    this.#id = uuid.v4()
    this.#title = title
    this.#maxUserCount = maxUserCount
    this.#roomOwnerUserIndex = 0
    this.#maxRound = maxRound
    this.#roundTimeLimit = roundTimeLimit

    if (password) {
      this.#password = password
      this.#isSecure = true
    }

    this.#userlist = [{ userId: roomOwnerUserId, isReady: false }]
  }

  /**
   * @returns {string}
   */
  get id() {
    return this.#id
  }

  /**
   * @returns {{
   *   id: string;
   *   title: string;
   *   state: 'preparing' | 'playing';
   *   isSecure: boolean;
   *   maxUserCount: number;
   *   currentUserCount: number;
   * }}
   */
  get info() {
    return {
      id: this.id,
      title: this.#title,
      state: this.#state,
      isSecure: this.#isSecure,
      maxUserCount: this.#maxUserCount,
      currentUserCount: this.#userlist.length,
    }
  }

  /**
   * @returns {{
   *   id: string;
   *   title: string;
   *   state: 'preparing' | 'playing';
   *   isSecure: boolean;
   *   maxUserCount: number;
   *   currentUserCount: number;
   *   userList: {
   *     userId: number;
   *     isReady: boolean;
   *   }[]
   *   maxRound: number;
   *   roundTimeLimit: number;
   *   roomOwnerUserId: number;
   * }}
   */
  get details() {
    return {
      ...this.info,
      userList: this.#userlist,
      maxRound: this.#maxRound,
      roundTimeLimit: this.#roundTimeLimit,
      roomOwnerUserId: this.#userlist[this.#roomOwnerUserIndex].userId,
    }
  }

  /**
   * @returns {boolean}
   */
  cannotStartGame() {
    return (
      this.#userlist.filter(
        (user, index) => !user.isReady && index !== this.#roomOwnerUserIndex,
      ).length > 0
    )
  }

  /**
   * @param {number} occurerUserId
   * @returns {Promise<string | null>} 방장이 아니거나 시작할 수 없을 경우 `null` 반환, 시작 시 방 ID 반환
   */
  async startGame(occurerUserId) {
    if (
      this.#userlist[this.#roomOwnerUserIndex].userId !== occurerUserId ||
      this.cannotStartGame()
    ) {
      return null
    }

    this.#gameStatus = new Game()
    await this.#gameStatus.initializeGame(
      this.#userlist.map(({ userId }) => userId),
      this.#maxRound,
      this.#roundTimeLimit,
    )

    return this.#id
  }

  /**
   * @param {number} occurerUserId
   * @returns {{
   *   roomId: string,
   *   currentRound: number,
   *   currentTurn: number,
   *   turnElapsed: number,
   * }}
   */
  startRound(occurerUserId) {
    if (
      this.#userlist[this.#roomOwnerUserIndex].userId !== occurerUserId ||
      this.#gameStatus.gameState !== 'game ready'
    ) {
      return null
    }

    this.#gameStatus.initializeNewRound()
    return {
      roomId: this.#id,
      ...this.#gameStatus.roundInfo,
    }
  }

  /**
   * @param {number} occurerUserId
   * @param {(roomId: string) => void} onTurnEnd
   * @param {(roomId: string) => void} onRoundEnd
   * @param {(roomId: string) => void} onGameEnd
   * @param {(roomId: string) => void} onTimerTick
   * @returns {{
   *   wordStartsWith: string;
   *   currentTurn: number;
   *   roomId: string;
   * } | null}
   */
  startTurn(occurerUserId, onTurnEnd, onRoundEnd, onGameEnd, onTimerTick) {
    if (!this.#gameStatus.isTurnOf(occurerUserId)) {
      return null
    }

    const startTurnResult = this.#gameStatus.startNewTurn(
      () => onTimerTick(this.#id),
      () => onTurnEnd(this.#id),
      () => onRoundEnd(this.#id),
      () => onGameEnd(this.#id),
    )

    return {
      ...startTurnResult,
      roomId: this.#id,
    }
  }

  /**
   * @returns {{
   *   userId: number;
   *   score: number;
   * }[]}
   */
  fetchRanking() {
    return this.#gameStatus.ranking
  }

  finishGame() {
    this.#gameStatus = null
    this.#state = 'preparing'
  }

  /**
   * @param {number} userId
   * @param {string} password default `null`
   * @throws {{
   *   error: string
   * }}
   */
  tryAddUser(userId, password = null) {
    if (this.#password !== null && this.#password !== password) {
      throw {
        error: 'wrong password',
      }
    }

    this.#userlist.push({ userId, isReady: false })
  }

  /**
   * @param {number} userId
   */
  delUser(userId) {
    this.#userlist = this.#userlist.filter((user) => user.userId !== userId)

    if (this.#gameStatus !== null) {
      this.#gameStatus.delUser(userId)
    }
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
          userId: user.userId,
          isReady: state,
        }
      } else {
        return {
          userId,
          isReady: user.isReady,
        }
      }
    })

    return changedIndex
  }

  /**
   * @returns {{
   *   usersSequence: {
   *     userId: number
   *     score: number
   *   }[];
   *   roundWord: string
   * } | null}
   */
  get currentGameInfo() {
    return this.#gameStatus?.gameInfo ?? null
  }
}
