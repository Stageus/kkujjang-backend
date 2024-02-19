import { gameConfig } from '#game/config'
import { shuffleArrayByFisherYates } from '#game/algorithm'
import * as dictionary from '#game/dictionary'

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
  roundWord = null

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
   *   onRoundEnd: (roundResult: {
   *     defeatedUserIndex: number;
   *     scoreDelta: number;
   *   }) => void;
   *   onGameEnd: () => void;
   *   roundTimeLeft: number;
   *   currentPersonalTimeLimit: number;
   *   personalTimeLeft: number;
   * }}
   */
  #timer = null

  /**
   * @type {number | null}
   */
  lastDefeatedUserIndex = null

  get timeStatusForTimer() {
    return {
      roundTimeLeft: this.#timer.roundTimeLeft,
      personalTimeLimit: this.#timer.currentPersonalTimeLimit,
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
      currentTurnUserId: this.usersSequence[this.currentTurnUserIndex]?.userId,
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
    if (this.usersSequence[this.currentTurnUserIndex]?.userId === userId) {
      this.#finishRound()
    }

    this.usersSequence = this.usersSequence.filter(
      (user) => user.userId !== userId,
    )
    this.currentTurnUserIndex =
      this.currentTurnUserIndex % this.usersSequence.length

    if (this.usersSequence.length <= 1) {
      this.#finishGame()
    }
  }

  /**
   * @param {number} userId
   * @returns {boolean}
   */
  isTurnOf(userId) {
    return this.usersSequence[this.currentTurnUserIndex].userId === userId
  }

  /**
   * @param {number} roundTimeLimit
   */
  startTimer(roundTimeLimit) {
    this.#timer.startTime = Date.now()
    this.#timer.roundTimeLeft = roundTimeLimit
    this.#timer.personalTimeLeft = roundTimeLimit / 10
    this.#timer.currentPersonalTimeLimit = roundTimeLimit / 10

    this.#timer.intervalTimeout = setInterval(
      this.#createOnTimerTick(this),
      gameConfig.timerInterval,
    )
  }

  #resumeTimer() {
    this.#timer = {
      onTimerTick: this.#timer.onTimerTick,
      onTurnEnd: this.#timer.onTurnEnd,
      onRoundEnd: this.#timer.onRoundEnd,
      onGameEnd: this.#timer.onGameEnd,
      startTime: Date.now(),
      intervalTimeout: null,
      roundTimeLeft: this.#timer.roundTimeLeft,
      personalTimeLeft: this.#timer.personalTimeLeft,
      currentPersonalTimeLimit: this.#timer.currentPersonalTimeLimit,
    }

    this.#timer.intervalTimeout = setInterval(
      this.#createOnTimerTick(this),
      gameConfig.timerInterval,
    )
  }

  #stopTimer() {
    this.#timer && clearInterval(this.#timer.intervalTimeout)
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

      game.#timer.startTime = Date.now()

      if (game.#timer.roundTimeLeft <= 0 || game.#timer.personalTimeLeft <= 0) {
        game.#stopTimer()
        game.#finishRound()
        return
      }
    }
  }

  /**
   * @param {number[]} userIdList
   * @param {number} maxRound
   * @param {{
   *   onTimerTick: () => void
   *   onTurnEnd: () => void
   *   onRoundEnd: (roundResult: {
   *   defeatedUserIndex: number;
   *   scoreDelta: number;
   * }) => void
   *   onGameEnd: () => void
   * }} callbacks
   */
  async initializeGame(
    userIdList,
    maxRound,
    { onTimerTick, onTurnEnd, onRoundEnd, onGameEnd },
  ) {
    this.usersSequence = shuffleArrayByFisherYates(
      userIdList.map((userId) => ({
        userId,
        score: 0,
      })),
    )

    this.#timer = {
      onTimerTick,
      onTurnEnd,
      onRoundEnd,
      onGameEnd,
      startTime: -1,
      roundTimeLeft: -1,
      personalTimeLeft: -1,
      intervalTimeout: null,
      currentPersonalTimeLimit: -1,
    }

    this.maxRound = maxRound
    this.roundWord = await this.#createRoundWord(maxRound)
    this.state = 'game ready'
  }

  initializeRound() {
    this.currentTurnUserIndex =
      this.lastDefeatedUserIndex === null ? 0 : this.lastDefeatedUserIndex

    console.log(`this round starts from ${this.currentTurnUserIndex}th user`)
    this.turnElapsed = 1
    this.wordStartsWith = this.roundWord[this.currentRound]
    this.usedWords = {}

    this.state = 'round ready'
  }

  initializeTurn() {
    this.state = 'turn proceeding'
  }

  #finishTurn() {
    this.#stopTimer()
    this.currentTurnUserIndex =
      (this.currentTurnUserIndex + 1) % this.usersSequence.length
    this.turnElapsed += 1
    this.state = 'round ready'

    this.#timer.onTurnEnd()
  }

  #finishRound() {
    this.#stopTimer()
    this.currentRound += 1

    const scoreDelta = gameConfig.failureScoreDelta
    this.#addScore(scoreDelta)
    this.#timer.onRoundEnd({
      defeatedUserIndex: this.currentTurnUserIndex,
      scoreDelta,
    })
    this.lastDefeatedUserIndex = this.currentTurnUserIndex

    this.state = 'game ready'

    if (this.currentRound >= this.maxRound) {
      this.#finishGame()
      return
    }
  }

  #finishGame() {
    this.#stopTimer()
    this.state = 'end'

    this.#timer.onGameEnd()
  }

  /**
   * @param {string} word
   * @returns {Promise<number | null>}
   */
  async checkIsValidWord(word) {
    this.#stopTimer()
    const definition = await dictionary.searchDefinition(word)
    this.#resumeTimer()

    if (definition === null || this.usedWords[word] === true) {
      return null
    }

    this.usedWords[word] = true

    const scoreDelta = this.#getSuccessScore(word.length)
    this.#addScore(scoreDelta)

    this.#finishTurn()
    this.wordStartsWith = word.charAt(word.length - 1)

    return scoreDelta
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
   */
  #getSuccessScore(wordLength) {
    return Math.ceil(
      2 *
        (Math.pow(5 + 7 * wordLength, 0.74) + 0.88 * this.turnElapsed) *
        (1 -
          (this.#timer.currentPersonalTimeLimit -
            this.#timer.personalTimeLeft) /
            (2 * this.#timer.currentPersonalTimeLimit)),
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

      console.log(`round word list is ${JSON.stringify(words)}`)

      return words[Math.floor(Math.random() * (words.length - 1))]
    } catch (err) {
      console.log(err)
      return null
    }
  }
}
