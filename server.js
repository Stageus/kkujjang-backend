import { configDotenv } from 'dotenv'
import express from 'express'
import https from 'https'
import asyncify from 'express-asyncify'
import cookieParser from 'cookie-parser'

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

if (sslOptions) {
  https.createServer(sslOptions, server).listen(process.env.HTTPS_PORT, () => {
    console.log(`Server is listening on port ${process.env.HTTPS_PORT}`)
  })
} else {
  server.listen(process.env.HTTP_PORT, () => {
    console.log(`Server is listening on port ${process.env.HTTP_PORT}`)
  })
}
