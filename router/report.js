import express from 'express'
import asyncify from 'express-asyncify'
import { configDotenv } from 'dotenv'
import * as validation from '@utility/validation'
import { pgQuery } from '@database/postgres'
import { requireAdminAuthority, requireSignin } from '@middleware/auth'
import {
  validateReport,
  validateReportModification,
  validateReportSearch,
} from '@middleware/report'

configDotenv()

export const reportRouter = asyncify(express.Router())

reportRouter.post('/', requireSignin, validateReport, async (req, res) => {
  const session = res.locals.session

  const {
    reporteeId,
    isOffensive = 0,
    isPoorManner = 0,
    isCheating = 0,
    note = '',
  } = req.body

  await pgQuery(
    `INSERT INTO kkujjang.report (
      author_id, 
      reportee_id,
      is_offensive,
      is_poor_manner,
      is_cheating,
      note
    ) VALUES ($1, $2, $3, $4, $5, $6);`,
    [session.userId, reporteeId, isOffensive, isPoorManner, isCheating, note],
  )

  res.json({ result: 'success' })
})

reportRouter.get(
  '/search',
  requireAdminAuthority,
  validateReportSearch,
  async (req, res) => {
    const {
      page = 1,
      reporterId = null,
      reporteeId = null,
      isOffensive = null,
      isPoorManner = null,
      isCheating = null,
    } = req.query

    // 입력받은 필터에 대해서만 WHERE 조건 추가
    // 1=1 등 같은 값 비교 시 반드시 true이므로 매개변수 개수 유지를 위해
    // null 값인 필터에 대해 해당 표현으로 대체
    const result = (
      await pgQuery(
        `SELECT
        report.id,
        author_id as reporterId, 
        reporter_user_table.nickname as reporterNickname,
        reportee_id as reporteeId, 
        reportee_user_table.nickname as reporteeNickname,
        is_offensive as isOffensive, 
        is_poor_manner as isPoorManner, 
        is_cheating as isCheating, 
        report.created_at as createdAt,
        note
      FROM kkujjang.report
        JOIN kkujjang.user reporter_user_table ON report.author_id = reporter_user_table.id
        JOIN kkujjang.user reportee_user_table ON report.reportee_id = reportee_user_table.id
      WHERE 
        ${reporterId === null ? `$1=$1` : `author_id=$1`} 
        ${reporteeId === null ? `AND $2=$2` : `AND reportee_id=$2`} 
        ${isOffensive === null ? `AND $3=$3` : `AND is_offensive=$3`} 
        ${isPoorManner === null ? `AND $4=$4` : `AND is_poor_manner=$4 `} 
        ${isCheating === null ? `AND $5=$5` : `AND is_cheating=$5`} 
      ORDER BY report.created_at DESC
      OFFSET ${(page - 1) * 10} LIMIT 10`,
        [
          Number(reporterId ?? 1),
          Number(reporteeId ?? 1),
          isOffensive ?? 1,
          isPoorManner ?? 1,
          isCheating ?? 1,
        ],
      )
    ).rows

    res.json({ result })
  },
)

// 처리 여부 변경
reportRouter.put(
  '/:reportId',
  requireAdminAuthority,
  validateReportModification,
  async (req, res) => {
    const { reportId } = req.params
    const { reportStatus } = req.body

    await pgQuery(`UPDATE kkujjang.report SET is_handled=$1 WHERE id=$2`, [
      reportStatus,
      reportId,
    ])

    res.json({ result: 'success' })
  },
)

reportRouter.get('/:reportId', requireAdminAuthority, async (req, res) => {
  const { reportId } = req.params
  validation.check(reportId, 'reportId', validation.checkExist())

  const result = (
    await pgQuery(
      `SELECT
        report.id,
        author_id as reporterId, 
        reporter_user_table.nickname as reporterNickname,
        reportee_id as reporteeId, 
        reportee_user_table.nickname as reporteeNickname,
        is_offensive as isOffensive, 
        is_poor_manner as isPoorManner, 
        is_cheating as isCheating, 
        report.created_at as createdAt,
        note
      FROM kkujjang.report
        JOIN kkujjang.user reporter_user_table ON report.author_id = reporter_user_table.id
        JOIN kkujjang.user reportee_user_table ON report.reportee_id = reportee_user_table.id
      WHERE report.id=$1`,
      [reportId],
    )
  ).rows[0]

  if (Object.keys(result).length == 0) {
    throw {
      statusCode: 409,
      message: '신고 내역을 찾을 수 없습니다.',
    }
  }

  res.json({ result })
})
