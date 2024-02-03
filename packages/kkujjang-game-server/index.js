// @ts-check

import { configDotenv } from 'dotenv'
import express from 'express'
import http from 'http'
import https from 'https'
import { Server } from 'socket.io'
import cookieParser from 'cookie-parser'
import { setupKkujjangWebSocket } from '#socket/kkujjang'
import fs from 'fs'

configDotenv()

const app = express()
const server = http.createServer(app)

const io = new Server(server)
setupKkujjangWebSocket(io)

const sslOptions =
  process.env.NODE_ENV === 'production'
    ? {
        key: fs.readFileSync(process.env.SSL_KEY_LOCATION ?? ''),
        cert: fs.readFileSync(process.env.SSL_CRT_LOCATION ?? ''),
        ca: fs.readFileSync(process.env.SSL_CA_LOCATION ?? ''),
      }
    : null

app.use(express.json())
app.use(cookieParser())
app.use(express.static('public'))

if (sslOptions) {
  https.createServer(sslOptions, app).listen(process.env.HTTPS_PORT, () => {
    console.log(`Server is listening on port ${process.env.HTTPS_PORT}`)
  })
} else {
  server.listen(process.env.HTTP_PORT, () => {
    console.log(`Server is listening on port ${process.env.HTTP_PORT}`)
  })
}
