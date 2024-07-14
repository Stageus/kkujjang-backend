// @ts-check

import { configDotenv } from 'dotenv'
import express from 'express'
import http from 'http'
import https from 'https'
import { Server } from 'socket.io'
import cookieParser from 'cookie-parser'
import { setupKkujjangWebSocket } from '#socket/kkujjang'
import { setUpBanChannel } from '#channel/ban'
import { setUpRoomIdUpdateChannel } from '#channel/roomIdUpdate'
import fs from 'fs'

configDotenv()

const sslOptions =
  process.env.NODE_ENV === 'production'
    ? {
        key: fs.readFileSync(process.env.SSL_KEY_LOCATION ?? ''),
        cert: fs.readFileSync(process.env.SSL_CRT_LOCATION ?? ''),
        ca: fs.readFileSync(process.env.SSL_CA_LOCATION ?? ''),
      }
    : null

const app = express()
const server = http.createServer(app)
const httpsServer =
  process.env.NODE_ENV === 'production'
    ? https.createServer(sslOptions, app)
    : null

const io = new Server(
  process.env.NODE_ENV === 'production' ? httpsServer : server,
  process.env.NODE_ENV === 'dev'
    ? {
        cors: {
          origin: '*',
          credentials: false,
        },
      }
    : undefined,
)

setupKkujjangWebSocket(io)
setUpBanChannel(io)
setUpRoomIdUpdateChannel()

app.use(express.json())
app.use(cookieParser())
app.use(express.static('public'))

if (sslOptions) {
  httpsServer.listen(process.env.WSS_PORT, () => {
    console.log(`Server is listening on port ${process.env.WSS_PORT}`)
  })
} else {
  server.listen(process.env.WS_PORT, () => {
    console.log(`Server is listening on port ${process.env.WS_PORT}`)
  })
}
