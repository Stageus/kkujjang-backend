import * as game from '@game/core'
import * as validation from '@utility/validation'

export const getMessageResult = (message, sessionId) => {
  try {
    validation.check(
      message.type,
      'socket message type',
      validation.checkExist(),
    )

    // session 관련 테스트가 진행되고 나서 아래 코드를 사용하여 sessionId 예외처리합니다.
    // validation.check(sessionId, 'sessionId', validation.checkExist())

    switch (message.type) {
      case 'TEST':
        const result = game.socketTest(message)
        return {
          type: 'TEST',
          value: `returned "${result}"`,
        }
      default:
        return {
          type: 'ERROR',
          message: `undefined type: ${message.type}`,
        }
    }
  } catch (error) {
    console.log(JSON.stringify(error))
    return {
      type: 'ERROR',
      message: JSON.stringify(error),
    }
  }
}
