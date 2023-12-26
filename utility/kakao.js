import { configDotenv } from 'dotenv'

configDotenv()

export const getToken = async (code) => {
  const response = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_REST_API_KEY,
      redirect_uri: process.env.KAKAO_REDIRECT_URI,
      code,
    }).toString(),
  })

  return await response.json()
}

export const getUserData = async (token) => {
  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-type': 'application/x-www-form-urlencoded',
    },
  })

  return await response.json()
}

export const unlink = async (token) => {
  await fetch('https://kapi.kakao.com/v1/user/unlink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-type': 'application/x-www-form-urlencoded',
    },
  })
}
