import { configDotenv } from 'dotenv'
import { redisClient } from '@database/redis'

configDotenv()

export const createSmsAuthSession = async (authNumber, receiverNumber) => {
  const smsAuthId = uuid.v4()

  await redisClient.hSet(`auth-${smsAuthId}`, {
    authNumber,
    fulfilled: 'false',
    receiverNumber,
  })
  await redisClient.expire(`auth-${smsAuthId}`, 300)

  return smsAuthId
}

export const getSmsAuthSession = async () => {}

export const sendSMS = async (receiverNumber, message) => {
  console.log(`send SMS "${message}" to ${receiverNumber}`)

  const response = await fetch('https://api.sendm.co.kr/v1/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'user-id': process.env.SENDM_ID,
      'api-key': process.env.SEMDM_REST_API_KEY,
    },
    body: JSON.stringify({
      callerNo: process.env.SEMDM_CALLER_NUMBER,
      receiveNos: receiverNumber,
      message: message,
    }),
  })

  return await response.text()
}
