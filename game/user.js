export class User {
  /**
   * @type {number}
   */
  id

  /**
   * @type {string}
   */
  roomId = null

  constructor(userId) {
    this.id = userId
  }
}
