import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

let s3Client: S3Client | null = null

/**
 * Get or create the S3 client singleton.
 * Lazily initialized to avoid errors when AWS env vars are not set (e.g., in tests).
 */
function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_SES_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return s3Client
}

/**
 * Fetch a raw email from S3.
 * SES stores the raw MIME email as an object in the configured S3 bucket.
 *
 * @param bucket - S3 bucket name where SES stores emails
 * @param key - S3 object key for the specific email
 * @returns The raw MIME email content as a string
 */
export async function fetchEmailFromS3(bucket: string, key: string): Promise<string> {
  const client = getS3Client()
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const response = await client.send(command)

  if (!response.Body) {
    throw new Error(`Empty response body for s3://${bucket}/${key}`)
  }

  return await response.Body.transformToString()
}
