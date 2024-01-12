import busboy from 'busboy'
import * as uuid from 'uuid'
import { PassThrough, pipeline } from 'stream'
import { s3Upload } from '@utility/kkujjang_multer/s3'
import {
  checkFileName,
  checkExtension,
} from '@utility/kkujjang_multer/file-analyzer'

export const multer = async (req, key, option, limits) =>
  new Promise((resolve, reject) => {
    if (!req.headers['content-type'].startsWith('multipart/form-data')) {
      reject({
        statusCode: 400,
        message: `kkujjang-multer : multipart/form-data 요청이 아닙니다`,
      })
    }
    // init
    const bb = busboy({ headers: req.headers, key, limits })

    const rejectEvent = (err) => {
      req.unpipe(bb)
      req.resume()
      bb.removeAllListeners()
      reject({
        statusCode: 400,
        message: `kkujjang-multer : ${err}`,
      })
    }

    // option 불러오기
    const { fileNumberLimit = Infinity, allowedExtension = [] } = option

    if (!Array.isArray(allowedExtension)) {
      rejectEvent('allowedExtension은 array 타입이어야합니다.')
    }

    const parsedText = {}
    const promiseList = []
    let fileCount = 0

    // init 끝

    // text 값 가져오기
    bb.on('field', (fieldname, value, { nameTruncated, valueTruncated }) => {
      if ((fieldname ?? null) === null) {
        rejectEvent('Text | filedname이 존재하지 않습니다')
      }
      if (nameTruncated) {
        rejectEvent('Text | filename의 길이 제한을 초과하였습니다')
      }
      if (valueTruncated) {
        rejectEvent('Text | value 값의 길이 제한을 초과하였습니다')
      }

      parsedText[fieldname] = value
    })

    bb.on(
      'file',
      async (fieldname, fileStream, { filename, encoding, mimeType }) => {
        // 예외처리
        if (fieldname !== 'files') {
          rejectEvent(
            `File | 제출한 파일의 fieldname : ${fieldname} | filedname은 'files'여야합니다`,
          )
        }

        // 파일이름 유효성 검증
        const fileNameValidation = checkFileName(filename)
        if (fileNameValidation.valid === false) {
          rejectEvent(fileNameValidation.message)
        }

        // 파일개수 유효성검증
        fileCount++
        if (fileNumberLimit < fileCount) {
          rejectEvent(
            `File | 파일 요청가능 최대 개수가 초과되었습니다. 최대 ${fileCountLimit}개`,
          )
        }

        fileStream.once('data', async (firstChunk) => {
          // 파일 확장자 유효성 검증
          const fileExtValidation = checkExtension(
            firstChunk,
            filename,
            allowedExtension,
          )

          if (!fileExtValidation.valid) {
            rejectEvent(fileExtValidation.message)
          }

          // 일치한다면 pipeline 구성 작업
          let passThrough = new PassThrough()
          passThrough.write(firstChunk)
          pipeline(fileStream, passThrough, (err) => {
            if (err) {
              rejectEvent(err)
            }
          })

          const filePath = `${key}/${Date.now()}-${filename}`
          const s3Promise = s3Upload(filePath, passThrough)
          promiseList.push(
            s3Promise
              .done()
              .catch(() =>
                rejectEvent(`File | ${filename} : 허가 용량을 초과하였습니다`),
              ),
          )
          // fileStream 이벤트 리스너 등록
          fileStream.on('error', (err) => {
            rejectEvent(err)
          })
          // 업로드하다가 파일 사이즈 한계 도래
          fileStream.on('limit', () => {
            s3Promise.abort()
          })
          fileStream.on('end', async () => {
            passThrough.end()
          })
          // fileStream 이벤트 리스너 등록 끝
        })
      },
    )

    // 이벤트 리스너의 return은 아무 영향을 끼치지않으므로 resovle로 return한 것과 같은 효과를낸다
    bb.on('finish', async () => {
      req.body = parsedText
      req.files = (await Promise.all(promiseList)).reduce(
        (prev, res) => [...prev, res.Location],
        [],
      )
      resolve()
    })

    // busboy 예외 이벤트 리스너 등록
    bb.on('error', (err) => {
      rejectEvent(err)
    })
    bb.on('partsLimit', () => {
      rejectEvent('Busboy | LIMIT_PART_COUNT')
    })
    bb.on('filesLimit', () => {
      rejectEvent('Busboy | LIMIT_FILE_COUNT')
    })
    bb.on('fieldsLimit', () => {
      rejectEvent('Busboy | LIMIT_FIELD_COUNT')
    })
    // busboy 예외 이벤트 리스너 등록 끝

    req.pipe(bb)
  })
