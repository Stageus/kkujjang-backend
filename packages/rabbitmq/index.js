import { configDotenv } from 'dotenv'
import amqp from 'amqplib'
import { createBanChannel } from './src/ban.js'

configDotenv()

export class RabbitMQ {
  static instance

  conn = null
  banChannel = null

  constructor() {
    if (RabbitMQ.instance) {
      return RabbitMQ.instance
    } else {
      RabbitMQ.instance = this
    }
  }

  async connect() {
    if (this.conn === null) {
      this.conn = await amqp.connect(
        `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@${process.env.RABBITMQ_HOST}:5672`,
      )
    }
    return this.conn
  }

  async connectToBanChannel() {
    if (this.banChannel === null) {
      const conn = await this.connect()
      this.banChannel = await createBanChannel(conn)
    }
    return this.banChannel
  }
}

new RabbitMQ()
