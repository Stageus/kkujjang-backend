import express from 'express'
import asyncify from 'express-asyncify'
import { requireAdminAuthority } from '#middleware/auth'
import { roomLogger } from 'logger'
import { validateRoomSearch } from '#middleware/room'

export const roomRouter = asyncify(express.Router())

roomRouter.get(
  '/',
  requireAdminAuthority,
  validateRoomSearch,
  async (req, res) => {
    const { roomId } = req.query

    const room = await roomLogger.loadRoom(roomId)
    const roomCreated = {}
    const roomExpired = {}
    const userHistory = []
    const gameHistory = []
    for (const log of room) {
      if (log.type === 'createRoom') {
        roomCreated.userId = log.userId
        roomCreated.createdAt = log.createdAt
        continue
      }
      if (log.type === 'expireRoom') {
        roomExpired.expiredAt = log.expiredAt
        continue
      }

      delete log._id
      delete log.roomId
      delete log.updatedAt
      delete log.__v
      if (log.type === 'userEnter' || log.type === 'userLeave') {
        userHistory.push(log)
        continue
      }

      if (
        log.type === 'gameStart' ||
        log.type === 'gameEnd' ||
        log.type === 'sayWord'
      ) {
        gameHistory.push(log)
        continue
      }
    }

    res.json({
      roomId,
      roomCreated,
      roomExpired,
      userHistory,
      gameHistory,
    })
  },
)
