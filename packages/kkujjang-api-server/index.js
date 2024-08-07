import express from 'express'
import https from 'https'
import asyncify from 'express-asyncify'
import cookieParser from 'cookie-parser'
import fs from 'fs'
import cors from 'cors'
import { configDotenv } from 'dotenv'
import { testRouter } from '#router/test'
import { userRouter } from '#router/user'
import { noticeRouter } from '#router/notice'
import { reportRouter } from '#router/report'
import { inquiryRouter } from '#router/inquiry'
import { rankingRouter } from '#router/ranking'
import { chatRouter } from '#router/chat'
import { roomRouter } from '#router/room'
import { banRouter } from '#router/ban'

configDotenv()

const app = asyncify(express())

const devCorsPolicy = {
  origin: '*',
}
process.env.NODE_ENV === 'dev' && app.use(cors(devCorsPolicy))

const sslOptions =
  process.env.NODE_ENV === 'production'
    ? {
        key: fs.readFileSync(process.env.SSL_KEY_LOCATION),
        cert: fs.readFileSync(process.env.SSL_CRT_LOCATION),
        ca: fs.readFileSync(process.env.SSL_CA_LOCATION),
      }
    : null

app.use(express.json())
app.use(cookieParser())
app.use(express.static('public'))

app.use('/test', testRouter)
app.use('/user', userRouter)
app.use('/notice', noticeRouter)
app.use('/report', reportRouter)
app.use('/inquiry', inquiryRouter)
app.use('/ranking', rankingRouter)
app.use('/chat', chatRouter)
app.use('/room', roomRouter)
app.use('/ban', banRouter)

app.use(async (err, req, res, next) => {
  const { statusCode = 500, message = 'undefined error', messages = [] } = err

  // message만 값 존재 -> message
  // messages만 값 존재 -> undefined error: {messages}
  // 둘 모두 값 존재 -> {message}: error1, error2, ...
  const errorMessage = `${message}${
    messages.length > 0 ? `: ${messages.join(', ')}` : ''
  }`

  const result = {
    error: errorMessage,
  }

  err.stack && console.log(err.stack)

  res.status(statusCode).json(result)
})

if (sslOptions) {
  https.createServer(sslOptions, app).listen(process.env.HTTPS_PORT, () => {
    console.log(`Server is listening on port ${process.env.HTTPS_PORT}`)
  })
} else {
  app.listen(process.env.HTTP_PORT, () => {
    console.log(`Server is listening on port ${process.env.HTTP_PORT}`)
  })
}
