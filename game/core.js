export const calculateScore = (wordLength, roundTimeLimit, roundTimeLeft) =>
  Math.floor(
    2 *
      (Math.pow(5 + 7 * wordLength, 0.74) + 0.88 * c) *
      (1 - (roundTimeLimit - roundTimeLeft) / (2 * roundTimeLimit)),
  )
