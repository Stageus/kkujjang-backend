import { configDotenv } from 'dotenv'

configDotenv()

export const searchDefinition = async (searchKeyword) => {
  const url = `https://stdict.korean.go.kr/api/search.do?${new URLSearchParams({
    key: process.env.STDICT_KOREAN_API_KEY,
    q: searchKeyword,
    req_type: 'json',
    advanced: 'y',
    method: 'exact',
    type1: 'word',
    // 접사, 동사, 형용사, 보조 동사, 보조 형용사, 어미 외 모두 가능
    pos: '1,2,3,4,7,8,9,10,11',
  }).toString()}`

  const response = await fetch(url, { method: 'GET' })
  const json = await response.json()
  const result = json?.channel?.item[0]?.sense.definition

  return result ?? null
}

export const searchWordsStartWith = async (
  searchKeyword,
  wordLengthMin = 1,
  wordLengthMax = 80,
) => {
  const url = `https://stdict.korean.go.kr/api/search.do?${new URLSearchParams({
    key: process.env.STDICT_KOREAN_API_KEY,
    q: searchKeyword,
    req_type: 'json',
    advanced: 'y',
    method: 'start',
    type1: 'word',
    letter_s: wordLengthMin,
    letter_e: wordLengthMax,
    // 접사, 동사, 형용사, 보조 동사, 보조 형용사, 어미 외 모두 가능
    pos: '1,2,3,4,7,8,9,10,11',
  }).toString()}`

  const response = await fetch(url, { method: 'GET' })
  const json = await response.json()
  const result = json?.channel?.item?.map(({ word }) => word.replace('-', ''))

  return result ?? null
}
