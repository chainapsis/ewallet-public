import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Result } from "@oko-wallet/stdlib-js";

export interface UploadToS3Args {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | Blob | string;
  contentType?: string;
}

export async function uploadToS3(
  args: UploadToS3Args,
): Promise<Result<string, string>> {
  try {
    const {
      region,
      accessKeyId,
      secretAccessKey,
      bucket,
      key,
      body,
      contentType,
    } = args;
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return {
      success: true,
      data: `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}
