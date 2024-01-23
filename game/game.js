import * as dictionary from '@utility/stdict-korean'

export class Game {
  /**
   * @type {{
   *   userId: number;
   *   score: number;
   * }[]}
   */
  #usersSequence = []

  /**
   * @type {string}
   */
  wordStartsWith

  /**
   * @type {number | null}
   */
  currentRound = null

  /**
   * @type {number}
   */
  #maxRound

  /**
   * @type {number | null}
   */
  currentTurn = null

  /**
   * @type {number}
   */
  turnElapsed = 0

  /**
   * @type {string}
   */
  roundWord

  /**
   * @type {'game ready' | 'round ready' | 'turn proceeding' | 'end'}
   */
  gameState

  /**
   * @type {{
   *   startTime: number;
   *   interval: NodeJS.Timeout | null;
   *   callback: () => void
   *   roundTimeLeft: number;
   *   roundTimeLimit: number;
   * }}
   */
  #timer = {
    startTime: 0,
    interval: null,
    callback: () => {},
    roundTimeLeft: 0,
    roundTimeLimit: 0,
  }

  /**
   * @type {{
   *   [word: string]: true
   * }}
   */
  #usedWords = {}

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
      usersSequence: this.#usersSequence,
      roundWord: this.roundWord,
    }
  }

  /**
   * @returns {{
   * currentRound: number,
   * currentTurn: number,
   * turnElapsed: number,
   * }}
   */
  get roundInfo() {
    return {
      currentRound: this.currentRound,
      currentTurn: this.currentTurn,
      turnElapsed: this.turnElapsed,
    }
  }

  /**
   * @returns {{
   *   userId: number;
   *   score: number;
   * }[]}
   */
  get ranking() {
    const usersSequenceClone = [...this.#usersSequence]
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
    this.#usersSequence = this.#usersSequence.filter(
      (user) => user.userId !== userId,
    )
  }

  /**
   * @param {number[]} userIdList
   * @param {number} maxRound
   * @param {number} roundTimeLimit
   */
  async initializeGame(userIdList, maxRound, roundTimeLimit) {
    this.#usersSequence = this.#shuffleArray(
      userIdList.map((userId) => ({
        userId,
        score: 0,
      })),
    )
    this.#maxRound = maxRound
    this.roundWord = await this.#createRoundWord()
    this.#timer.roundTimeLimit = roundTimeLimit

    this.gameState = 'game ready'
  }

  initializeNewRound() {
    this.currentRound = this.currentRound === null ? 0 : this.currentRound + 1
    this.currentTurn = 0
    this.turnElapsed = 1
    this.#timer.roundTimeLeft = this.#timer.roundTimeLimit
    this.wordStartsWith = this.roundWord[this.currentRound]
    this.#usedWords = {}

    this.gameState = 'round ready'
  }

  /**
   * @param {() => void} onTurnEnd
   */
  startNewTurn(onTurnEnd) {
    this.gameState = 'turn proceeding'

    this.#timer.startTime = Date.now()
    this.#timer.callback = onTurnEnd
    this.#timer.interval = setInterval(this.#createTimerFunction(this), 100)

    this.currentTurn = (this.currentTurn + 1) % this.#usersSequence.length
    this.turnElapsed += 1
  }

  /**
   * @param {Game} game
   * @returns {() => void}
   */
  #createTimerFunction(game) {
    return () => {
      game.#timer.callback()
    }
  }

  /**
   * @param {string} word
   * @param {(userIndex: number, scoreDelta: number) => void} onValid
   */
  async checkIsValidWord(word, onValid) {
    const definition = await dictionary.searchDefinition(word)
    if (definition === null || this.#usedWords[word] === true) {
      return null
    }

    this.#stopTimer()
    this.#usedWords[word] = true

    const scoreDelta = +this.#getSuccessScore(word.length)
    this.#applyScore(scoreDelta)

    this.gameState = 'round ready'
    onValid(this.currentTurn, scoreDelta)
  }

  /**
   * @param {number} scoreDelta
   */
  #applyScore(scoreDelta) {
    this.#usersSequence[this.currentTurn].score += scoreDelta

    if (this.#usersSequence[this.currentTurn].score < 0) {
      this.#usersSequence[this.currentTurn].score = 0
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
          (this.#timer.roundTimeLimit - this.#timer.roundTimeLeft) /
            (2 * this.#timer.roundTimeLimit)),
    )
  }

  #getFailureScore() {
    return 200
  }

  #stopTimer() {
    clearInterval(this.#timer.interval)
  }

  /**
   * @param {*[]} array
   */
  #shuffleArray(array) {
    const newArray = [...array]

    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = newArray[i]
      newArray[i] = newArray[j]
      newArray[j] = temp
    }

    return newArray
  }

  async #createRoundWord() {
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

    const words = await dictionary.searchWordsStartWith(
      starterCandidates[
        Math.floor(Math.random() * (starterCandidates.length - 1))
      ],
      this.#maxRound,
      this.#maxRound,
    )

    return words[Math.floor(Math.random() * (words.length - 1))]
  }
}
