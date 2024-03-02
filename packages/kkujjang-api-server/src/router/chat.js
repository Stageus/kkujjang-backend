import express from 'express'
import asyncify from 'express-asyncify'
import { requireAdminAuthority } from '#middleware/auth'
import { chatLogger } from 'logger'

export const chatRouter = asyncify(express.Router())

chatRouter.get('/', requireAdminAuthority, async (req, res) => {
  const { userId, dateStart, dateEnd } = req.query

  const chats = await chatLogger.loadChats({
    userId,
    dateStart,
    dateEnd,
  })

  res.json(chats)
})
