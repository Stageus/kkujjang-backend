import express from 'express'
import asyncify from 'express-asyncify'
import { requireAdminAuthority } from '#middleware/auth'
import { chatLogger } from 'logger'
import { validateChatSearchQuery } from '#middleware/chat'

export const chatRouter = asyncify(express.Router())

chatRouter.get(
  '/',
  requireAdminAuthority,
  validateChatSearchQuery,
  async (req, res) => {
    const { userId, roomId, dateStart, dateEnd } = req.query

    const chats = await chatLogger.loadChats({
      userId: Number(userId),
      roomId,
      dateStart,
      dateEnd,
    })

    if (chats.length === 0) {
      throw {
        statusCode: 400,
        message: '검색 필터와 일치하는 정보가 존재하지 않습니다',
      }
    }

    res.json(chats)
  },
)
