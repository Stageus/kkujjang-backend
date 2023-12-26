import { configDotenv } from 'dotenv'

configDotenv()

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
