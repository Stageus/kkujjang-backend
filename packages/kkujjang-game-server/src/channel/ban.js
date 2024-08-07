import { Server } from 'socket.io'
import { configDotenv } from 'dotenv'
import { RabbitMQ } from 'rabbitmq'
import { getSocketIdByUserID } from '#utility/socketid-mapper'

configDotenv()

const queueName = process.env.USER_BANNED_QUEUE_NAME

/**
 * @param {Server} io
 * @returns {Promise<void>}
 */
export const setUpBanChannel = async (io) => {
  const banChannel = await RabbitMQ.instance.connectToBanChannel()
  banChannel.consume(queueName, (msg) => {
    const data = JSON.parse(msg.content.toString())
    console.log(data)

    const socketId = getSocketIdByUserID(data.userId)

    if (socketId === undefined) {
      banChannel.ack(msg)
      return
    }

    const socket = io.sockets.sockets.get(socketId)

    if (socket === undefined) {
      banChannel.ack(msg)
      return
    }

    socket.emit('banned', data)
    socket.disconnect(true)

    banChannel.ack(msg)
  })
}
