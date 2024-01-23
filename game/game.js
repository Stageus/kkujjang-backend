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
  currentTurn

  /**
   * @type {number}
   */
  turnElapsed

  /**
   * @type {string}
   */
  roundWord

  /**
   * @type {{
   *   startTime: number;
   *   interval: NodeJS.Timeout;
   *   roundTimeLeft: number;
   * }}
   */
  #timer

  /**
   * @type {{
   *   [word: string]: true | undefined
   * }}
   */
  #usedWords

  /**
   * @param {number[]} userIdList
   */
  constructor(userIdList) {
    this.#usersSequence = userIdList.map((userId) => ({
      userId,
      score: 0,
    }))
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
}
