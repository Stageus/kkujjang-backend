import path from 'path'
import busboy from 'busboy'
import * as uuid from 'uuid'
import { PassThrough, pipeline } from 'stream'
import { s3Upload } from '@utility/kkujjang_multer/s3'
import { config } from '@utility/kkujjang_multer/config'
import { validataion } from '@utility/kkujjang_multer/module/option-validataion'
import {
  checkFileName,
  checkExtension,
} from '@utility/kkujjang_multer/module/file-analyzer'

export const multer = async (req, key, option, limits) =>
  new Promise((resolve, reject) => {
    if (!req.headers['content-type'].startsWith('multipart/form-data')) {
      reject({
        statusCode: 400,
        message: `kkujjang-multer | multipart/form-data 요청이 아닙니다`,
      })
    }

    // option 불러오기
    const optionValidation = validataion(option)
    if (optionValidation.valid === false) {
      reject({
        statusCode: 400,
        message: `kkujjang-multer | ${optionValidation.message}`,
      })
    }

    const {
      fileNameType,
      fileSize,
      maxFileCount,
      allowedExtensions = ['*'],
    } = option
    // option 불러오기 끝

    // config 불러오기
    const { fileNameLength, fieldNameSize, fieldSize, fields } = config
    // config 불러오기 끝

    // busboy 객체 생성
    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize,
        files: maxFileCount,
        fieldNameSize,
        fieldSize,
        fields,
      },
    })
    // busboy 객체 생성 끝

    const rejectEvent = (err) => {
      req.unpipe(bb)
      req.resume()
      bb.removeAllListeners()
      reject({
        statusCode: 400,
        message: `kkujjang-multer | ${err}`,
      })
    }

    const parsedText = {}
    const promiseList = []

    // text 값 가져오기
    bb.on('field', (fieldname, value, { nameTruncated, valueTruncated }) => {
      if ((fieldname ?? null) === null) {
        rejectEvent('Text | fieldname이 존재하지 않습니다')
      }
      if (nameTruncated) {
        rejectEvent(
          `Text | field name의 크기 제한을 초과하였습니다. 최대 ${fieldNameSize}Byte`,
        )
      }
      if (valueTruncated) {
        rejectEvent(
          `Text | field value의 크기 제한을 초과하였습니다. 최대 ${fieldSize}Byte`,
        )
      }

      parsedText[fieldname] = value
    })

    bb.on(
      'file',
      async (fieldname, fileStream, { filename, encoding, mimeType }) => {
        // 예외처리
        if (fieldname !== 'files') {
          rejectEvent(
            `File | 제출한 파일의 fieldname은 ${fieldname} : fieldname은 'files'여야합니다`,
          )
        }

        // 파일이름 유효성 검증
        const fileNameValidation = checkFileName(filename, fileNameLength)
        if (fileNameValidation.valid === false) {
          rejectEvent(fileNameValidation.message)
        }

        fileStream.once('data', async (firstChunk) => {
          // 파일 확장자 유효성 검증
          const fileExtValidation = checkExtension(
            firstChunk,
            filename,
            allowedExtensions,
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

          const uploadFileName =
            fileNameType === 'timestamp'
              ? `${Date.now()}-${filename}`
              : `${uuid.v4()}${path.extname(filename)}`

          const filePath = `${key}/${uploadFileName}`
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
      rejectEvent(
        `File | 파일 요청가능 최대 개수가 초과되었습니다. 최대 ${maxFileCount}개`,
      )
    })
    bb.on('fieldsLimit', () => {
      rejectEvent(`Text | field의 최대 개수가 초과되었습니다. 최대 ${fields}개`)
    })
    // busboy 예외 이벤트 리스너 등록 끝

    req.pipe(bb)
  })
