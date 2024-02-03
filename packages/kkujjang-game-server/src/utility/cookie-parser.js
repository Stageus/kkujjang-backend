// @ts-check

/**
 * @param {string} cookieString
 * @returns {{
 *   [key: string]: string
 * }}
 */
export const parseCookie = (cookieString) => {
  if (!cookieString) {
    return {}
  }

  const cookieList = cookieString.split(';')

  return cookieList.reduce((prevCookies, cookieText) => {
    const cookieData = cookieText.split('=')
    return {
      ...prevCookies,
      [cookieData[0]]: cookieData[1],
    }
  }, {})
}
