import { configDotenv } from 'dotenv'
import { RabbitMQ } from 'rabbitmq'
import { pgQuery } from 'postgres'
import { Lobby } from '#game/lobby'

configDotenv()

const queueName = process.env.ROOMID_UPDATE_QUEUE_NAME

/**
 * @returns {Promise<void>}
 */
export const setUpReplyRoomIdUpdateChannel = async () => {
  const roomIdUpdateChannel =
    await RabbitMQ.instance.connectToRoomIdUpdateChannel()

  roomIdUpdateChannel.consume(queueName, async (msg) => {
    const data = JSON.parse(msg.content.toString())
    const { id, userId } = data
    const roomId = Lobby.instance.getRoomIdByUserId(userId)

    console.log(data)
    roomIdUpdateChannel.ack(msg)

    try {
      await pgQuery(
        `UPDATE kkujjang.report 
        SET room_id = $1
        WHERE id = $2`,
        [roomId, id],
      )
    } catch (err) {
      console.log(`방 ID 업데이트 중 오류가 발생했습니다 : ${err}`)
    }
  })
}
