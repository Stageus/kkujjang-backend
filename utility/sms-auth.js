import { configDotenv } from 'dotenv'
import { redisClient } from '@database/redis'
import * as uuid from 'uuid'

configDotenv()

export const createSmsAuthSession = async (authNumber, receiverNumber) => {
  const smsAuthId = uuid.v4()

  await redisClient.hSet(`auth-${smsAuthId}`, {
    authNumber,
    fulfilled: 'false',
    phoneNumber: receiverNumber,
  })
  await redisClient.expire(`auth-${smsAuthId}`, 300)

  return smsAuthId
}

export const isValidSmsAuthorization = async (
  authNumber,
  phoneNumber,
  smsAuthId,
) => {
  const { authNumber: answer, phoneNumber: targetPhoneNumber } =
    await redisClient.hGetAll(`auth-${smsAuthId}`)

  console.log(
    `got ${authNumber} by ${phoneNumber} while the answer is ${answer} of ${targetPhoneNumber}`,
  )
  const isValid = phoneNumber === targetPhoneNumber && authNumber === answer

  if (isValid) {
    redisClient.hSet(`auth-${smsAuthId}`, {
      fulfilled: 'true',
    })
    redisClient.expire(`auth-${smsAuthId}`, 1800)
  }

  return isValid
}

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
