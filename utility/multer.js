import multer from 'multer'
import multerS3 from 'multer-s3'
import busboy from 'busboy'
import { s3 } from '@database/s3'
import { checkMaginNumber } from '@utility/magicNumber'

export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read',
    key: async (req, file, cb) => {
      const detectedExtension = await getFileType(file)
      const key =
        file.mimetype === detectedExtension
          ? Date.now().toString()
          : 'trash/user1234'
      cb(null, key)
    },
  }),
  limits: {
    files: 10,
    filseSize: 1024 * 1024 * 5,
  },
})

const getFileType = (file) => {
  return new Promise((resolve, reject) => {
    file.stream.once('data', function (firstChunk) {
      const type = checkMaginNumber(firstChunk)
      let mime = 'ext/unknown'

      if ((!type || type.ext === 'xml') && isSvg(firstChunk.toString())) {
        mime = 'image/svg+xml'
      } else if (type) {
        mime = type.mime
      }

      resolve(mime)
    })
  })
}
