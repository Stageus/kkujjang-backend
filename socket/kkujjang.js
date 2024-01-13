import * as game from '@game/core'
import * as validation from '@utility/validation'

export const getMessageResult = (message, sessionId) => {
  try {
    validation.check(
      message.type,
      'socket message type',
      validation.checkExist(),
    )
    validation.check(sessionId, 'sessionId', validation.checkExist())

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
