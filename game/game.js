import { gameConfig } from './config'
import { shuffleArrayByFisherYates } from './algorithm'
import * as dictionary from './dictionary'

export class Game {
  /**
   * @type {{
   *   userId: number;
   *   score: number;
   * }[]}
   */
  usersSequence = []

  /**
   * @type {string}
   */
  wordStartsWith

  /**
   * @type {number | null}
   */
  currentRound = 0

  /**
   * @type {number}
   */
  maxRound

  /**
   * @type {number | null}
   */
  currentTurnUserIndex = null

  /**
   * @type {number}
   */
  turnElapsed = 0

  /**
   * @type {string}
   */
  roundWord

  /**
   * @type {'game ready' | 'round ready' | 'turn ready' | 'turn proceeding' | 'end'}
   */
  state

  /**
   * @type {{
   *   startTime: number;
   *   intervalTimeout: NodeJS.Timeout | null;
   *   onTurnEnd: () => void;
   *   onTimerTick: () => void;
   *   onRoundEnd: () => void;
   *   onGameEnd: () => void;
   *   roundTimeLeft: number;
   *   personalTimeLeft: number;
   * }}
   */
  #timer = null

  get timeStatusForTimer() {
    return {
      roundTimeLeft: this.#timer.roundTimeLeft,
      personalTimeLeft: this.#timer.personalTimeLeft,
    }
  }

  /**
   * @type {{
   *   [word: string]: true
   * }}
   */
  usedWords = {}

  /**
   * @type {string}
   */
  lastWord

  get status() {
    return {
      usersSequence: this.usersSequence,
      wordStartsWith: this.wordStartsWith,
      currentRound: this.currentRound,
      maxRound: this.maxRound,
      currentTurnUserIndex: this.currentTurnUserIndex,
      turnElapsed: this.turnElapsed,
      roundWord: this.roundWord,
    }
  }

  /**
   * @returns {{
   *   usersSequence: {
   *     userId: number
   *     score: number
   *   }[];
   *   roundWord: string
   * }}
   */
  get gameInfo() {
    return {
      usersSequence: this.usersSequence,
      roundWord: this.roundWord,
    }
  }

  /**
   * @returns {{
   *   userId: number;
   *   score: number;
   * }[]}
   */
  get ranking() {
    const usersSequenceClone = [...this.usersSequence]
    usersSequenceClone.sort((user1, user2) => {
      // 점수 높은 순으로 정렬
      return user2.score - user1.score
    })

    return usersSequenceClone
  }

  /**
   * @param {number} userId
   */
  delUser(userId) {
    this.usersSequence = this.usersSequence.filter(
      (user) => user.userId !== userId,
    )
  }

  /**
   * @param {number} userId
   * @returns {boolean}
   */
  isTurnOf(userId) {
    return this.usersSequence[this.currentTurnUserIndex].userId === userId
  }

  /**
   * @param {{
   *   onTimerTick: () => void;
   *   onTurnEnd: () => void;
   *   onRoundEnd: () => void;
   *   onGameEnd: () => void;
   * }} callbacks
   */
  #initializeTimer({ onTimerTick, onTurnEnd, onRoundEnd, onGameEnd }) {
    this.#timer = {
      onTimerTick,
      onTurnEnd,
      onRoundEnd,
      onGameEnd,
      startTime: -1,
      intervalTimeout: null,
      roundTimeLeft: undefined,
      personalTimeLeft: undefined,
    }
  }

  /**
   * @param {number} roundTimeLimit
   * @param {{
   *   onTimerTick: () => void;
   *   onTurnEnd: () => void;
   *   onRoundEnd: () => void;
   *   onGameEnd: () => void;
   * }} callbacks
   */
  startTimer(roundTimeLimit, callbacks) {
    this.#initializeTimer(callbacks)

    this.#timer.startTime = Date.now()
    this.#timer.roundTimeLeft =
      this.#timer.roundTimeLeft === undefined
        ? roundTimeLimit
        : this.#timer.roundTimeLeft
    this.#timer.personalTimeLeft = roundTimeLimit / 10

    this.#timer.intervalTimeout = setInterval(
      this.#createOnTimerTick(this),
      gameConfig.timerInterval,
    )
  }

  #stopTimer() {
    clearInterval(this.#timer.intervalTimeout)
  }

  /**
   * @param {Game} game
   * @returns {() => void}
   */
  #createOnTimerTick(game) {
    return () => {
      if (game.state !== 'turn proceeding') {
        return
      }

      const timeElapsed = Date.now() - game.#timer.startTime
      game.#timer.roundTimeLeft -= timeElapsed
      game.#timer.personalTimeLeft -= timeElapsed
      game.#timer.onTimerTick()

      if (game.#timer.roundTimeLeft <= 0 || game.#timer.personalTimeLeft <= 0) {
        game.#stopTimer()
        game.#finishRound()
        game.#addScore(gameConfig.failureScoreDelta)
        return
      }
    }
  }

  /**
   * @param {number[]} userIdList
   * @param {number} maxRound
   */
  async initializeGame(userIdList, maxRound) {
    this.usersSequence = shuffleArrayByFisherYates(
      userIdList.map((userId) => ({
        userId,
        score: 0,
      })),
    )

    this.maxRound = maxRound
    this.roundWord = await this.#createRoundWord(maxRound)
    this.state = 'game ready'
  }

  initializeRound() {
    this.currentTurnUserIndex = 0
    this.turnElapsed = 1
    this.wordStartsWith = this.roundWord[this.currentRound]
    this.usedWords = {}

    this.state = 'round ready'
  }

  initializeTurn() {
    this.state = 'turn proceeding'
  }

  #finishTurn() {
    this.currentTurnUserIndex =
      (this.currentTurnUserIndex + 1) % this.usersSequence.length
    this.turnElapsed += 1
    this.state = 'turn ready'

    this.#timer.onTurnEnd()
  }

  #finishRound() {
    this.currentRound += 1
    this.#timer.onRoundEnd()

    this.state = 'game ready'

    if (this.currentRound >= this.maxRound) {
      this.#finishGame()
      return
    }

    this.#timer = null
  }

  #finishGame() {
    this.state = 'end'

    this.#timer.onGameEnd()
    clearInterval(this.#timer.intervalTimeout)

    this.#timer = null
    this.state = 'round ready'
  }

  /**
   * @param {string} word
   * @param {number} personalTimeLimit
   * @param {(userIndex: number, scoreDelta: number) => void} onValid
   */
  async checkIsValidWord(word, personalTimeLimit, onValid) {
    const definition = await dictionary.searchDefinition(word)
    if (definition === null || this.usedWords[word] === true) {
      return null
    }

    this.#stopTimer()
    this.usedWords[word] = true

    const scoreDelta = this.#getSuccessScore(word.length, personalTimeLimit)
    this.#addScore(scoreDelta)

    this.state = 'round ready'
    onValid(this.currentTurnUserIndex, scoreDelta)
  }

  /**
   * @param {number} scoreDelta
   */
  #addScore(scoreDelta) {
    this.usersSequence[this.currentTurnUserIndex].score += scoreDelta

    if (this.usersSequence[this.currentTurnUserIndex].score < 0) {
      this.usersSequence[this.currentTurnUserIndex].score = 0
    }
  }

  /**
   * @param {number} wordLength
   * @param {number} personalTimeLimit
   */
  #getSuccessScore(wordLength, personalTimeLimit) {
    return Math.ceil(
      2 *
        (Math.pow(5 + 7 * wordLength, 0.74) + 0.88 * this.turnElapsed) *
        (1 -
          (personalTimeLimit - this.#timer.personalTimeLeft) /
            (2 * personalTimeLimit)),
    )
  }

  /**
   * @param {number} maxRound
   * @returns {Promise<string | null>}
   */
  async #createRoundWord(maxRound) {
    const starterCandidates = [
      '가',
      '나',
      '다',
      '라',
      '마',
      '바',
      '사',
      '아',
      '자',
      '차',
      '카',
      '타',
      '파',
      '하',
    ]

    try {
      const words = await dictionary.searchWordsStartWith(
        starterCandidates[
          Math.floor(Math.random() * (starterCandidates.length - 1))
        ],
        maxRound,
        maxRound,
      )

      return words[Math.floor(Math.random() * (words.length - 1))]
    } catch (err) {
      console.log(err)
      return null
    }
  }
}
