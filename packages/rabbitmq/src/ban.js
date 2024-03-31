import amqp from 'amqplib'

/**
 * @param {amqp.Connection} conn 싱글톤
 * @returns {Promise<amqp.Channel>} 싱글톤
 */
export const createBanChannel = async (conn) => {
  const channel = await conn.createChannel()
  await channel.assertQueue(process.env.USER_BANNED_QUEUE_NAME, {
    durable: false,
  })
  console.log('RabbitMQ 밴채널에 연결되었습니다.')
  return channel
}
