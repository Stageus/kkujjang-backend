import { configDotenv } from 'dotenv'
import { Pool } from 'pg'

configDotenv()

const dbConfig = {
  host: process.env.RDB_HOST,
  port: process.env.RDB_PORT,
  user: process.env.RDB_USER,
  password: process.env.RDB_PASSWORD,
  database: process.env.RDB_NAME,
}

const pgPool = new Pool(dbConfig)

pgPool.on('error', (err, client) => {
  console.error('Unexpected Error on PG Client.', err)
})

console.log(
  `Created PG Pool to ${dbConfig.host}:${dbConfig.port} with user ${dbConfig.user}`,
)

export const pgQuery = async (query, parameters = undefined) => {
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
