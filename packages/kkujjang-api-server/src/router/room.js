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

    if (room.length === 0) {
      throw {
        statusCode: 400,
        message: '검색 필터와 일치하는 정보가 존재하지 않습니다',
      }
    }

    const roomLife = {}

    roomLife.createdAt = room[0].createdAt

    roomLife.expiredAt =
      3 <= room.length ? room[room.length - 2].createdAt : undefined

    res.json({
      roomId,
      ...roomLife,
      logs: room,
    })
  },
)
