import express from 'express'
import asyncify from 'express-asyncify'
import { configDotenv } from 'dotenv'
import { pgQuery } from 'postgres'
import { requireAdminAuthority, requireSignin } from '#middleware/auth'
import {
  validateReport,
  validateReportModification,
  validateReportPathIndex,
  validateReportSearch,
} from '#middleware/report'
import { validatePageNumber } from '#middleware/page'

configDotenv()

export const reportRouter = asyncify(express.Router())

reportRouter.post('/', requireSignin, validateReport, async (req, res) => {
  const session = res.locals.session

  const {
    reporteeId,
    isOffensive,
    isPoorManner,
    isCheating,
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
  validatePageNumber,
  async (req, res) => {
    const {
      page,
      reporterId,
      reporteeId,
      isOffensive,
      isPoorManner,
      isCheating,
    } = req.query

    // 입력받은 필터에 대해서만 WHERE 조건 추가
    // 1=1 등 같은 값 비교 시 반드시 true이므로 매개변수 개수 유지를 위해
    // 빈 값인 필터에 대해 해당 표현으로 대체
    const result = (
      await pgQuery(
        `SELECT
          CEIL(report_count::float / 10) AS "lastPage",
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'id', id, 
              'isOffensive', is_offensive,
              'isPoorManner', is_poor_manner,
              'isCheating', is_cheating,
              'note', note,
              'createdAt', report_created_at,
              'reporterId', reporter_id,
              'reporterNickname', reporter_nickname,
              'reporteeId', reportee_id,
              'reporteeNickname', reportee_nickname
            )
          ) AS list
        FROM (
          SELECT 
            report.id,
            author_id AS reporter_id, 
            reporter_user_table.nickname AS reporter_nickname,
            reportee_id, 
            reportee_user_table.nickname AS reportee_nickname,
            is_offensive, 
            is_poor_manner, 
            is_cheating, 
            report.created_at AS report_created_at,
            note,
            COUNT(*) OVER() AS report_count
          FROM kkujjang.report
            JOIN kkujjang.user reporter_user_table ON report.author_id = reporter_user_table.id
            JOIN kkujjang.user reportee_user_table ON report.reportee_id = reportee_user_table.id
          WHERE 
            ${reporterId === null ? `$1=$1` : `author_id=$1`} 
            ${reporteeId === null ? `AND $2=$2` : `AND reportee_id=$2`} 
            ${isOffensive === null ? `AND $3=$3` : `AND is_offensive=$3`} 
            ${isPoorManner === null ? `AND $4=$4` : `AND is_poor_manner=$4 `} 
            ${isCheating === null ? `AND $5=$5` : `AND is_cheating=$5`}
          ORDER BY report_created_at DESC
          OFFSET ${(Number(page) - 1) * 10} LIMIT 10
        ) AS sub_table
        GROUP BY report_count`,
        [
          Number(reporterId ?? 1),
          Number(reporteeId ?? 1),
          isOffensive ?? 1,
          isPoorManner ?? 1,
          isCheating ?? 1,
        ],
      )
    ).rows[0] ?? {
      lastPage: 0,
      list: [],
    }

    res.json({ result })
  },
)

// 처리 여부 변경
reportRouter.put(
  '/:reportId',
  requireAdminAuthority,
  validateReportPathIndex,
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

reportRouter.get(
  '/:reportId',
  requireAdminAuthority,
  validateReportPathIndex,
  async (req, res) => {
    const { reportId } = req.params

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
        message: '신고 내역을 찾을 수 없습니다.',
      }
    }

    res.json({ result })
  },
)
