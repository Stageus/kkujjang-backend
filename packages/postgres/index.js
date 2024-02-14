// @ts-check

import { configDotenv } from 'dotenv'
import pg from 'pg'

configDotenv()

/**
 * @type {import('pg').PoolConfig}
 */
const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.PGPORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database:
    process.env.NODE_ENV === 'production'
      ? process.env.POSTGRES_NAME
      : process.env.POSTGRES_TEST_NAME,
  statement_timeout: 1000,
  query_timeout: 1000,
  connectionTimeoutMillis: 1000,
}

const pgPool = new pg.Pool(dbConfig)

pgPool.on('error', (err, client) => {
  console.error('Unexpected Error on PG Client.', err)
})

console.log(
  `Created PG Pool to ${dbConfig.host}:${dbConfig.port} with user ${dbConfig.user}`,
)

/**
 * @param {string} query
 * @param {*[]} [parameters]
 * @returns {Promise<pg.QueryResult<any>>}
 */
export const pgQuery = async (query, parameters) => {
  const connection = await pgPool.connect()
  let result = null

  try {
    result = await connection.query(query, parameters)
  } catch (e) {
    throw e
  } finally {
    connection.release()
  }

  return result
}
