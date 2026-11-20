import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

const hasS3 = !!env.S3_UPLOAD_BUCKET && !!env.AWS_REGION;

const s3Client = hasS3 ? new S3Client({ region: env.AWS_REGION }) : null;

export async function getPresignedUploadUrl(assetId: string, filename: string, contentType: string): Promise<string> {
  if (s3Client && env.S3_UPLOAD_BUCKET) {
    const command = new PutObjectCommand({
      Bucket: env.S3_UPLOAD_BUCKET,
      Key: `uploads/${assetId}/original-${filename}`,
      ContentType: contentType,
    });
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
  }

  // Local fallback: return a URL that client can PUT to (e.g., our server)
  return `${env.CLIENT_URL}/api/v1/videos/local-upload/${assetId}`;
}
