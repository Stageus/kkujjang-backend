import amqp from 'amqplib'

/**
 * @param {amqp.Connection} conn
 * @returns {Promise<amqp.Channel>}
 */
export const createBanChannel = async (conn) => {
  const channel = await conn.createChannel()
  await channel.assertQueue(process.env.USER_BANNED_QUEUE_NAME, {
    durable: false,
  })
  console.log('RabbitMQ | 밴 채널에 연결되었습니다.')
  return channel
}
