import amqp from 'amqplib'

/**
 * @param {amqp.Connection} conn
 * @returns {Promise<amqp.Channel>}
 */
export const createRoomIdFindChannel = async (conn) => {
  const channel = await conn.createChannel()
  await channel.assertQueue(process.env.ROOMID_FIND_QUEUE_NAME, {
    durable: false,
  })
  console.log('RabbitMQ 방 찾기 채널에 연결되었습니다.')
  return channel
}
