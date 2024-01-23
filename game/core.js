// @ts-check

import * as dictionary from '@utility/stdict-korean'

import { Room } from './room'
import { User } from './user'

export class GameManager {
  /**
   * @type {GameManager} 싱글톤
   */
  static instance

  /**
   * @type {{
   *   [roomId: string]: Room
   * }}
   */
  #gameRooms = {}

  /**
   * @type {{
   *   [userId: number]: User
   * }}
   */
  #users = {}

  constructor() {
    // 싱글톤 패턴
    if (GameManager.instance) return GameManager.instance
    GameManager.instance = this
  }

  /**
   * @returns {object[]}
   */
  get roomList() {
    return Object.keys(this.#gameRooms).map(
      (roomId) => this.#getRoom(roomId).info,
    )
  }

  /**
   * @param {number} userId
   * @returns {object}
   */
  getRoomDetailsByUserId(userId) {
    return this.#getRoomByUserId(userId).details
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
    const room = new Room({
      roomOwnerUserId,
      title,
      password,
      maxUserCount,
      maxRound,
      roundTimeLimit,
    })
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
    this.#getRoom(roomId).tryAddUser(userId, password)
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
   * @returns {string} 나간 방의 ID 반환, 사용자가 로비에 있다면 `null` 반환
   */
  leaveRoom(userId, onRoomOwnerChange) {
    if (this.isUserAtLobby(userId)) {
      return null
    }

    const roomId = this.#getRoomByUserId(userId)?.id
    const room = this.#getRoom(roomId)

    room.delUser(userId)

    const { currentUserCount } = room.info
    if (currentUserCount === 0) {
      this.destroyRoom(roomId)
      return roomId
    }

    const { roomOwnerUserId } = room.details
    if (roomOwnerUserId === userId) {
      const newRoomOwnerIndex = room.setNewRoomOwner()
      onRoomOwnerChange(roomId, newRoomOwnerIndex)
    }

    return roomId
  }

  /**
   * @param {string} roomId
   */
  destroyRoom(roomId) {
    delete this.#gameRooms[roomId]
  }

  /**
   * @param {number} userId
   * @returns {boolean}
   */
  isUserAtLobby(userId) {
    return this.#getRoomByUserId(userId) === null
  }

  /**
   * @param {number} userId
   * @param {boolean} state
   * @return {number} 준비 여부 변경 적용된 사용자의 인덱스 반환
   */
  switchReadyState(userId, state) {
    return this.#getRoomByUserId(userId).switchReadyState(userId, state)
  }

  /**
   * @param {string} roomId
   * @returns {Room | null} 존재하지 않는 방일 경우 `null` 반환
   */
  #getRoom(roomId) {
    if (!roomId) return null

    return this.#gameRooms[roomId] ?? null
  }

  /**
   * @param {number} userId
   * @returns {Room | null} 사용자가 로비에 있다면 `null` 반환
   */
  #getRoomByUserId(userId) {
    return this.#getRoom(this.#users[userId]?.roomId)
  }

  /**
   * @param {number} userId
   * @returns {string | null} 사용자가 로비에 있다면 `null` 반환
   */
  getRoomIdByUserId(userId) {
    return this.#getRoomByUserId(userId)?.id ?? null
  }
}

new GameManager()

export const getSuccessScore = (
  wordLength,
  roundTimeLimit,
  roundTimeLeft,
  turnElapsed,
) =>
  Math.ceil(
    2 *
      (Math.pow(5 + 7 * wordLength, 0.74) + 0.88 * turnElapsed) *
      (1 - (roundTimeLimit - roundTimeLeft) / (2 * roundTimeLimit)),
  )

export const getFailureScore = () => {
  return 200
}

export const getDefinition = async (word) => {
  return await dictionary.searchDefinition(word)
}

export const getRoundWord = async (length) => {
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
    length,
    length,
  )

  return words[Math.floor(Math.random() * (words.length - 1))]
}
