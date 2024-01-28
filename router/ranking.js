import express from 'express'
import asyncify from 'express-asyncify'
import schedule from 'node-schedule'
import { pgQuery } from '@database/postgres'
import { getRanking, updateRanking } from '@utility/ranking'

// 서버시간 기준 자정에 쿼리문 수행
schedule.scheduleJob('0 0 * * *', async () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`

  try {
    const rankingData = (
      await pgQuery(
        `SELECT 
          CAST(RANK() OVER (
            ORDER BY level DESC, exp DESC
          ) AS INT) AS rank, 
          id, 
          level, 
          nickname 
        FROM kkujjang.user
        ORDER BY level DESC, exp DESC, id ASC
        LIMIT 100`,
      )
    ).rows

    await updateRanking(JSON.stringify(rankingData))

    console.log(`${formattedDate} | Successfully updated the ranking`)
  } catch (err) {
    console.log(`${formattedDate} | Ranking update failed`)
    console.log(err)
  }
})

export const rankingRouter = asyncify(express.Router())

rankingRouter.get('/', async (req, res) => {
  const rankingData = JSON.parse(await getRanking())
  res.json({
    result: rankingData,
  })
})
