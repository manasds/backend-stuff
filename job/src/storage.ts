import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const accountId = requireEnv("R2_ACCOUNT_ID");
export const bucket = requireEnv("R2_BUCKET");

// Cloudflare R2 exposes an S3-compatible API. Region must be "auto".
export const s3 = new S3Client({
  region: "auto",
  endpoint:
    process.env.R2_ENDPOINT ??
    `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  },
});

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObject(
  key: string,
): Promise<{ body: Buffer; contentType: string }> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!res.Body) throw new Error(`Object not found: ${key}`);
  const bytes = await res.Body.transformToByteArray();
  return {
    body: Buffer.from(bytes),
    contentType: res.ContentType ?? "application/octet-stream",
  };
}

// Seconds a download URL stays valid. Presigned URLs cap at 7 days.
const urlExpiresIn = Number(process.env.R2_URL_EXPIRES_IN) || 3600;

export async function getDownloadUrl(key: string): Promise<string> {
  // If the bucket is served by a public / custom domain, build a direct URL
  // instead of signing (no expiry, no signature).
  if (process.env.R2_PUBLIC_URL) {
    return `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: urlExpiresIn,
  });
}
