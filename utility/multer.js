import multer from 'multer'
import multerS3 from 'multer-s3'
import { s3 } from '@database/s3'

export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read',
    key: (req, file, cb) => {
      const prefix = req.body.id
      const filename = req.body.filename
      const key = `${prefix}/${filename}`
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
