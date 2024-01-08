import busboy from 'busboy'
import * as uuid from 'uuid'
import { PassThrough, pipeline } from 'stream'
import { s3Upload, s3CountFile } from '@utility/kkujjang_multer/s3'
import {
  checkAuthor,
  checkExtension,
} from '@utility/kkujjang_multer/file-analyzer'

export const multer = async (req, limits, options) =>
  new Promise((resolve, reject) => {
    if (!req.headers['content-type'].startsWith('multipart/form-data')) {
      reject({
        statusCode: 400,
        message: `kkujjang-multer : multipart 요청이 아닙니다`,
      })
    }
    // init
    const bb = busboy({ headers: req.headers, limits })

    const rejectEvent = (err) => {
      req.unpipe(bb)
      req.resume()
      bb.removeAllListeners()
      reject({
        statusCode: 400,
        message: `kkujjang-multer : ${err}`,
      })
    }

    // options 불러오기
    const {
      author = null,
      fileCountLimit = -1,
      allowedExtension = [],
    } = options
    const isAuthorCheckMode = !(author === null)

    let { subkey = '' } = options

    // options 검증
    if (isAuthorCheckMode) {
      if (!(author?.userId && author?.idColumnName && author?.tableName)) {
        rejectEvent(
          'autor은 json 타입이며 userId, idColumnName, tableName의 값을 가지고 있어야합니다',
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
    let isAuthorChecked = false
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

      if (fieldname === 'id') {
        if (!value) {
          textResult[fieldname] = uuid.v4()
          isAuthorChecked = true
        } else {
          RegExp(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
          ).test(value)
            ? null
            : rejectEvent(
                'TEXT | id 텍스트 필드의 value는 UUID 형식이여야합니다',
              )
          textResult[fieldname] = value
        }
        return
      }

      textResult[fieldname] = value
    })

    bb.on(
      'file',
      async (fieldname, fileStream, { filename, encoding, mimeType }) => {
        // 예외처리
        if (!textResult.id) {
          rejectEvent(
            `Text | form-data에서 id 텍스트 필드는 files 필드보다 앞서 지정해야합니다`,
          )
        }
        if (fieldname !== 'files') {
          rejectEvent(
            `File | 제출한 파일의 fieldname : ${fieldname} | filedname은 'files'여야합니다`,
          )
        }
        if (!filename) {
          rejectEvent('File | filename이 존재하지 않습니다')
        }
        if (201 <= filename.length) {
          rejectEvent('File | filename은 200자 이하여야합니다')
        }
        if (isAuthorCheckMode && isAuthorChecked === false) {
          // authorCheck 모드라면 해당 id에 대해 권한 검증
          const valid = await checkAuthor(author, textResult.id)
          isAuthorChecked = true
          if (valid === false) {
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
            rejectEvent(`File | ${textResult.id}의 저장 개수가 초과되었습니다.`)
          }
        }

        // 첫번째 청크를 읽었을 때 파일 확장자 검사 수행
        fileStream.once('data', async (firstChunk) => {
          const result = checkExtension(firstChunk, filename, allowedExtension)
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

          const filePath = `${
            textResult.id
          }/${subkey}/${Date.now()}-${filename}`
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
