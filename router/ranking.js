import express from 'express'
import asyncify from 'express-asyncify'
import { getRanking, setRankingUpdateSchedule } from '@utility/ranking'

setRankingUpdateSchedule()

export const rankingRouter = asyncify(express.Router())

rankingRouter.get('/', async (req, res) => {
  const rankingData = JSON.parse(await getRanking())
  res.json({
    result: rankingData,
  })
})
