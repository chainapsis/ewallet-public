import dotenv from "dotenv";

import type { UploadToS3Args } from "@oko-wallet-aws/s3";
import { uploadToS3 } from "@oko-wallet-aws/s3";

dotenv.config();

const region = process.env.S3_REGION || "";
const accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
const bucket = process.env.S3_BUCKET || "";

describe("s3_test", () => {
  it("uploads a file to s3 and returns the URL", async () => {
    if (!region || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error("S3 environment variables are not set.");
    }

    const key = "test-upload/test.txt";
    const body = `test upload - ${new Date().toISOString()}`;
    const args: UploadToS3Args = {
      region,
      accessKeyId,
      secretAccessKey,
      bucket,
      key,
      body,
      contentType: "text/plain",
    };
    const expectedUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
    const result = await uploadToS3(args);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expectedUrl);
      console.log("Uploaded S3 URL:", result.data);
    } else {
      console.error("S3 upload failed:", result.err);
    }
  });
});
