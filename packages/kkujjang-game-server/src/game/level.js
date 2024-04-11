import { gameConfig } from './config.js'

/**
 * @param {number} exp
 * @returns {number}
 */
export const getLevel = (exp) => {
  return 1 + Math.floor(exp / gameConfig.level.levelDevider)
}
