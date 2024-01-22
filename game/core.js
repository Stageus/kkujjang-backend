import * as dictionary from '@utility/stdict-korean'

export const getSuccessScore = (
  wordLength,
  roundTimeLimit,
  roundTimeLeft,
  turnElapsed,
) =>
  Math.ceil(
    2 *
      (Math.pow(5 + 7 * wordLength, 0.74) + 0.88 * turnElapsed) *
      (1 - (roundTimeLimit - roundTimeLeft) / (2 * roundTimeLimit)),
  )

export const getFailureScore = () => {
  return 200
}

export const getDefinition = async (word) => {
  return await dictionary.searchDefinition(word)
}

export const getRoundWord = async (length) => {
  const starterCandidates = [
    '가',
    '나',
    '다',
    '라',
    '마',
    '바',
    '사',
    '아',
    '자',
    '차',
    '카',
    '타',
    '파',
    '하',
  ]

  const words = await dictionary.searchWordsStartWith(
    starterCandidates[
      Math.floor(Math.random() * (starterCandidates.length - 1))
    ],
    length,
    length,
  )

  return words[Math.floor(Math.random() * (words.length - 1))]
}
