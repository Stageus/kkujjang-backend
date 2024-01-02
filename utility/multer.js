import multer from 'multer'
import multerS3 from 'multer-s3'
import { s3 } from '@database/s3'

export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read',

    // 콜백함수는 미들웨어 multer-S3에 정의된 공통으로 사용하는 콜백함수입니다
    // null 부분은 콜백함수에서는 쓰이지않는 부분으로 null로 줍니다
    // key 부분은 S3에 업로드할 key의 이름을 전달합니다
    key: (req, file, cb) => {
      const prefix = req.body.id
      const filename = req.body.filename
      const key = `${prefix}/${Date.now()}-${filename}`
      cb(null, key)
    },
  }),
  limits: {
    files: 10,
    fileSize: 1024 * 1024 * 11,
  },
  fileFilter: (req, file, cb) => {
    if (req.ip.split(':').pop() !== '127.0.0.1') {
      req.body.badRequest = true
      cb(null, false)
    }
    cb(null, true)
  },
})
