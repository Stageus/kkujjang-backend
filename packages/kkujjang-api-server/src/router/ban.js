import { configDotenv } from 'dotenv'
import express from 'express'
import asyncify from 'express-asyncify'
import { RabbitMQ } from 'rabbitmq'
import { authSession } from 'kkujjang-session'

configDotenv()

export const banRouter = asyncify(express.Router())

banRouter.post('/', async (req, res) => {
  const { userId, bannedUntil, bannedReason } = req.body
  const banChannel = await RabbitMQ.instance.connectToBanChannel()
  await banChannel.sendToQueue(
    process.env.USER_BANNED_QUEUE_NAME,
    Buffer.from(JSON.stringify({ userId, bannedUntil, bannedReason })),
  )

  await authSession.destroySessionByUserId(userId)

  res.send({ result: 'success' })
})
