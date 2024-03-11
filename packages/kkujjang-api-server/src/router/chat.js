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
    const { userId, dateStart, dateEnd } = req.query

    const chats = chatLogger.loadChats({
      userId,
      dateStart,
      dateEnd,
    })

    res.json(chats)
  },
)
