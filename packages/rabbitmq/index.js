import { configDotenv } from 'dotenv'
import amqp from 'amqplib'
import { createBanChannel } from '#src/ban'
import { createRoomIdUpdateChannel } from '#src/roomIdFind'

configDotenv()

export class RabbitMQ {
  /**
   * @type {RabbitMQ} 싱글톤
   */
  static instance

  /**
   * @type {null | amqp.Connection}
   */
  conn = null

  /**
   * @type {null | amqp.Channel}
   */
  banChannel = null

  /**
   * @type {null | amqp.Channel}
   */
  roomIdUpdateChannel = null

  constructor() {
    if (RabbitMQ.instance) {
      return RabbitMQ.instance
    } else {
      RabbitMQ.instance = this
    }
  }

  /**
   * @returns {Promise<amqp.Connection>}
   */
  async connect() {
    if (this.conn === null) {
      this.conn = await amqp.connect(
        `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`,
      )
    }
    return this.conn
  }

  /**
   * @returns {Promise<amqp.Channel>}
   */
  async connectToBanChannel() {
    if (this.banChannel === null) {
      const conn = await this.connect()
      this.banChannel = await createBanChannel(conn)
    }
    return this.banChannel
  }

  /**
   * @returns {Promise<amqp.Channel>}
   */
  async connectToRoomIdUpdateChannel() {
    if (this.roomIdUpdateChannel === null) {
      const conn = await this.connect()
      this.roomIdUpdateChannel = await createRoomIdUpdateChannel(conn)
    }
    return this.roomIdUpdateChannel
  }
}

new RabbitMQ()
