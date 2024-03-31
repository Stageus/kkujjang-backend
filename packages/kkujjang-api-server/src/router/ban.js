import { configDotenv } from 'dotenv'
import express from 'express'
import asyncify from 'express-asyncify'
import { RabbitMQ } from 'rabbitmq'
import { pgQuery } from 'postgres'
import { authSession } from 'kkujjang-session'
import { validateBan } from '#middleware/ban'
import { requireAdminAuthority } from '#middleware/auth'

configDotenv()

export const banRouter = asyncify(express.Router())

banRouter.put('/', requireAdminAuthority, validateBan, async (req, res) => {
  const { userId, bannedReason, bannedDays } = req.body
  const banChannel = await RabbitMQ.instance.connectToBanChannel()
  await banChannel.sendToQueue(
    process.env.USER_BANNED_QUEUE_NAME,
    Buffer.from(
      JSON.stringify({ userId, bannedReason, bannedDays: Number(bannedDays) }),
    ),
  )
  await authSession.destroySessionByUserId(userId)

  const dateMills = Date.now() + Number(bannedDays) * 24 * 60 * 60 * 1000
  const bannedUntil = new Date(dateMills)
  await pgQuery(
    `UPDATE kkujjang.user
    SET is_banned = TRUE, banned_reason = $1, banned_until = $2
    WHERE id = $3`,
    [bannedReason, bannedUntil, userId],
  )

  res.send({ result: 'success' })
})
