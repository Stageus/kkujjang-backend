import { configDotenv } from 'dotenv'
import express from 'express'
import https from 'https'
import asyncify from 'express-asyncify'
import cookieParser from 'cookie-parser'
import { testRouter } from '@router/test'

configDotenv()

const server = asyncify(express())

const sslOptions =
  process.env.NODE_ENV === 'production'
    ? {
        key: fs.readFileSync(process.env.SSL_KEY_LOCATION),
        cert: fs.readFileSync(process.env.SSL_CRT_LOCATION),
        ca: fs.readFileSync(process.env.SSL_CA_LOCATION),
      }
    : null

server.use(express.json())
server.use(cookieParser())

server.use('/test', testRouter)

server.use(async (err, req, res, next) => {
  const { statusCode = 500, message = 'undefined error', messages = [] } = err

  // message만 값 존재 -> message
  // messages만 값 존재 -> undefined error: {messages}
  // 둘 모두 값 존재 -> {message}: error1, error2, ...
  const errorMessage = `${message}${
    messages.length > 0 && `: ${messages.join(', ')}`
  }`

  const result = {
    error: errorMessage,
  }

  err.stack && console.log(err.stack)

  res.status(statusCode).json(result)
})

if (sslOptions) {
  https.createServer(sslOptions, server).listen(process.env.HTTPS_PORT, () => {
    console.log(`Server is listening on port ${process.env.HTTPS_PORT}`)
  })
} else {
  server.listen(process.env.HTTP_PORT, () => {
    console.log(`Server is listening on port ${process.env.HTTP_PORT}`)
  })
}
