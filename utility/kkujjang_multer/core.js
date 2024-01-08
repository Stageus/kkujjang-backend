import busboy from 'busboy'
import * as uuid from 'uuid'
import { PassThrough, pipeline } from 'stream'
import { s3Upload, s3CountFile } from '@database/s3'
import {
  checkAuthorization,
  checkExtension,
} from '@utility/kkujjang_multer/file-analyzer'

export const multer = async (req, limits, options) =>
  new Promise((resolve, reject) => {
    // init
    const bb = busboy({ headers: req.headers, limits })
    let isRejected = false

    const rejectEvent = (err) => {
      req.unpipe(bb)
      req.resume()
      bb.removeAllListeners()
      isRejected = true
      reject({
        statusCode: 400,
        message: `kkujjang-multer : ${err}`,
      })
    }

    // options 불러오기
    let {
      checkAuthor = false,
      subkey = '',
      fileCountLimit = -1,
      allowedExtension = [],
    } = options

    // options 검증
    if (checkAuthor) {
      if (
        !(
          typeof checkAuthor === 'object' &&
          checkAuthor.userId &&
          checkAuthor.idColumnName &&
          checkAuthor.tableName
        )
      ) {
        rejectEvent(
          'checkAutor은 json이며 userId, idColumnName, tableName의 값을 가지고 있어야합니다',
        )
      }
    }

    if (!(Number.isInteger(fileCountLimit) && -1 <= fileCountLimit)) {
      rejectEvent(
        'fileCountLimit은 -1 이상의 int 타입이어야합니다. | -1이면 파일 수를 체크하지 않음',
      )
    }

    if (!Array.isArray(allowedExtension)) {
      rejectEvent('allowedExtension은 array 타입이어야합니다.')
    }

    const textResult = {}
    const promiseList = []

    let fileCount = -1
    let valid = false
    // init 끝

    // text 값 가져오기
    !isRejected &&
      bb.on('field', (fieldname, value, { nameTruncated, valueTruncated }) => {
        if (fieldname == null) {
          rejectEvent('Text | key 이름이 존재하지 않습니다')
        }
        if (nameTruncated) {
          rejectEvent('Text | key 이름의 길이 제한을 초과하였습니다')
        }
        if (valueTruncated) {
          rejectEvent('Text | value 값의 길이 제한을 초과하였습니다')
        }

        if (fieldname === 'id') {
          if (value) {
            textResult[fieldname] = value
            valid = false
            return
          }
          if (!value) {
            textResult[fieldname] = uuid.v4()
            valid = true
            return
          }
        }

        textResult[fieldname] = value
      })

    !isRejected &&
      bb.on(
        'file',
        async (fieldname, fileStream, { filename, encoding, mimeType }) => {
          // 예외처리
          if (!filename) {
            rejectEvent('File | filename이 존재하지 않습니다')
          }
          if (201 <= filename.length) {
            rejectEvent('File | filename은 200자 이하여야합니다')
          }
          if (fieldname !== 'files') {
            rejectEvent(`File | ${fieldname} : filedname은 'files'여야합니다`)
          }

          // checkAuthor 모드라면 해당 id에 대해 권한 검증
          if (checkAuthor && !valid) {
            const valid = await checkAuthorization(checkAuthor, textResult.id)
            if (!valid) {
              rejectEvent(`File | ${textResult.id}에 저장할 권한이 없습니다.`)
            }
          }

          // countFile 모드라면 해당 id에 대해 권한 검증
          if (fileCountLimit !== -1) {
            if (fileCount === -1) {
              if (subkey === '') {
                subkey = (await s3CountFile(`${textResult.id}/`)) + 1
                fileCount = 0
              } else {
                fileCount = await s3CountFile(`${textResult.id}/${subkey}/`)
              }
            }

            fileCount++

            if (fileCountLimit < fileCount) {
              rejectEvent(
                `File | ${textResult.id}의 저장 개수가 초과되었습니다.`,
              )
            }
          }

          // 첫번째 청크를 읽었을 때 파일 확장자 검사 수행
          fileStream.once('data', async (firstChunk) => {
            const result = checkExtension(
              firstChunk,
              filename,
              allowedExtension,
            )
            if (!result.valid) {
              rejectEvent(result.message)
            }

            // 일치한다면 pipeline 구성 작업
            let passThrough = new PassThrough()
            passThrough.write(firstChunk)
            pipeline(fileStream, passThrough, (err) => {
              if (err) {
                rejectEvent(err)
              }
            })
            // S3 업로드 경로를 설정해줄 id 와 filename을 함께 전달해준다
            const filePath = `${
              textResult.id
            }/${subkey}/${Date.now()}-${filename}`
            const s3Promise = s3Upload(filePath, passThrough)
            promiseList.push(
              s3Promise
                .done()
                .catch(() =>
                  rejectEvent(
                    `File | ${filename} : 허가 용량을 초과하였습니다`,
                  ),
                ),
            )
            // fileStream 이벤트 리스너 등록
            fileStream.on('error', (err) => {
              reject({
                statusCode: 500,
                message: err,
              })
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
      const result = {}
      result.text = textResult
      result.files = (await Promise.all(promiseList)).reduce(
        (prev, res) => [...prev, res.Location],
        [],
      )
      resolve(result)
    })

    // busboy 예외 이벤트 리스너 등록
    bb.on('error', (err) => {
      reject({
        statusCode: 500,
        message: err,
      })
    })
    bb.on('partsLimit', () => {
      rejectEvent('Busboy | LIMIT_PART_COUNT')
    })
    bb.on('filesLimit', () => {
      rejectEvent('Busyboy | LIMIT_FILE_COUNT')
    })
    bb.on('fieldsLimit', () => {
      rejectEvent('Busyboy | LIMIT_FIELD_COUNT')
    })
    // busboy 예외 이벤트 리스너 등록 끝

    req.pipe(bb)
  })
