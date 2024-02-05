// @ts-check

import { GameRoom } from './gameRoom'
import { User } from './user'

let curRoomNumber = 100
const isRoomNumberExist = []

export class Lobby {
  /**
   * @type {Lobby} 싱글톤
   */
  static instance

  /**
   * @type {{
   *   [roomId: string]: GameRoom
   * }}
   */
  #gameRooms = {}

  /**
   * @returns {object[]}
   */
  get roomList() {
    return Object.keys(this.#gameRooms).map(
      (roomId) => this.getRoom(roomId).info,
    )
  }

  /**
   * @type {{
   *   [userId: number]: User
   * }}
   */
  #users = {}

  constructor() {
    // 싱글톤 패턴
    if (Lobby.instance) return Lobby.instance
    Lobby.instance = this
  }

  /**
   * @param {string} roomId
   * @returns {GameRoom | null} 존재하지 않는 방일 경우 `null` 반환
   */
  getRoom(roomId) {
    if (!roomId) return null``
    return this.#gameRooms[roomId] ?? null
  }

  /**
   * @param {number} userId
   * @returns {GameRoom | null} 사용자가 로비에 있다면 `null` 반환
   */
  getRoomByUserId(userId) {
    return this.getRoom(this.#users[userId]?.roomId)
  }

  /**
   * @param {number} userId
   * @returns {object}
   */
  getRoomDetailsByUserId(userId) {
    return this.getRoomByUserId(userId).fullInfo
  }

  get userList() {
    return Object.keys(this.#users).map((user) => user)
  }

  /**
   * @param {number} userId
   */
  enterUser(userId) {
    this.#users[userId] = new User(userId)
  }

  /**
   * @param {{
   *   roomOwnerUserId: number;
   *   title: string;
   *   password: string;
   *   maxUserCount: number;
   *   maxRound: number;
   *   roundTimeLimit: number;
   * }} roomConfig
   * @returns {string}
   */
  createRoom({
    roomOwnerUserId,
    title,
    password,
    maxUserCount,
    maxRound,
    roundTimeLimit,
  }) {
    const room = new GameRoom({
      roomOwnerUserId,
      title,
      password,
      maxUserCount,
      maxRound,
      roundTimeLimit,
    })

    let is1000RoomExist = false
    while (isRoomNumberExist[curRoomNumber]) {
      curRoomNumber++
      if (1000 <= curRoomNumber && is1000RoomExist === false) {
        curRoomNumber = 100
        is1000RoomExist = true
      }
      if (1000 <= curRoomNumber && is1000RoomExist === true) {
        throw {
          error: '이미 1천개의 방이 존재해서 방을 만들 수 없습니다',
        }
      }
    }

    isRoomNumberExist[curRoomNumber] = true
    room.setRoomNumber(curRoomNumber)

    this.#gameRooms[room.id] = room
    this.#users[roomOwnerUserId].roomId = room.id

    return room.id
  }

  /**
   * 비밀번호가 틀릴 경우 예외 throw
   * @param {string} roomId
   * @param {number} userId
   * @param {string} password
   */
  tryJoiningRoom(roomId, userId, password = null) {
    this.getRoom(roomId).tryJoin(userId, password)
    this.#users[userId].roomId = roomId
  }

  /**
   * @param {number} userId
   * @param {(roomId: string, newRoomOwnerIndex: number) => void} onRoomOwnerChange
   * @returns {string} 방에 속한 채로 접속 종료 시 방의 ID 반환, 그 외 null 반환
   */
  quitUser(userId, onRoomOwnerChange) {
    const roomId = this.leaveRoom(userId, onRoomOwnerChange)
    delete this.#users[userId]
    return roomId
  }

  /**
   * 방장이 나가는 경우 방장 재선출
   * @param {number} userId
   * @param {(roomId: string, newRoomOwnerIndex: number) => void} onRoomOwnerChange
   */
  leaveRoom(userId, onRoomOwnerChange) {
    if (this.isUserAtLobby(userId)) {
      return null
    }

    const room = this.getRoomByUserId(userId)

    room.delUser(userId)

    const { currentUserCount } = room
    if (currentUserCount === 0) {
      this.destroyRoom(room.id)
      return room.id
    }

    const { roomOwnerUserId } = room.fullInfo
    if (roomOwnerUserId === userId) {
      const newRoomOwnerIndex = room.setNewRoomOwner()
      onRoomOwnerChange(room.id, newRoomOwnerIndex)
    }
  }

  /**
   * @param {string} roomId
   */
  destroyRoom(roomId) {
    this.#gameRooms[roomId].state = 'destroyed'
    const curRoomNumber = this.#gameRooms[roomId].roomNumber
    isRoomNumberExist[curRoomNumber] = false
    delete this.#gameRooms[roomId]
  }

  /**
   * @param {number} userId
   * @returns {boolean}
   */
  isUserAtLobby(userId) {
    return this.getRoomByUserId(userId) === null
  }
}

new Lobby()
