import { S3Client } from "@aws-sdk/client-s3";

let client: S3Client | undefined;

export const bucket = () => process.env.R2_BUCKET as string;

export function r2() {
  client ??= new S3Client({
    region: process.env.R2_ENDPOINT ? "us-east-1" : "auto",
    endpoint:
      process.env.R2_ENDPOINT ??
      `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
    // The SDK's default checksums end up in presigned URLs, which browsers cannot satisfy.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}
