import express from 'express'
import asyncify from 'express-asyncify'
import { requireAdminAuthority } from '#middleware/auth'
import { roomLogger } from 'logger'
import { validateRoomSearch } from '#middleware/room'

export const roomRouter = asyncify(express.Router())

roomRouter.get(
  '/:roomId',
  requireAdminAuthority,
  validateRoomSearch,
  async (req, res) => {
    const roomId = req.params.roomId
    const room = await roomLogger.loadRoom(roomId)

    const roomLife = {}

    roomLife.createdAt = room[0].createdAt
    roomLife.expiredAt = room[room.length - 2].createdAt

    res.json({
      roomId,
      ...roomLife,
      logs: room,
    })
  },
)
