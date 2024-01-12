import { Upload } from '@aws-sdk/lib-storage'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

export const s3Upload = (filePath, fileStream) => {
  const parallelUploads3 = new Upload({
    client: s3,
    params: {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: filePath,
      Body: fileStream,
      ACL: process.env.AWS_BUCKET_ACL,
    },
  })

  return parallelUploads3
}
