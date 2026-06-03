// Cloudflare R2 photo storage (S3-compatible), via the tiny `aws4fetch` signer.
//
// NOTE: aws4fetch only implements AWS Signature V4 — it is NOT the AWS service
// or the heavy aws-sdk. R2 speaks the S3 protocol, so the same signing works.
// No AWS account is involved.
//
// We never proxy image bytes through Next.js. The app asks for a presigned PUT
// URL, uploads straight to R2, then tells us the resulting public URL + key.
//
// Required env (see .env.example):
//   R2_ACCOUNT_ID         Cloudflare account id
//   R2_ACCESS_KEY_ID      R2 API token access key
//   R2_SECRET_ACCESS_KEY  R2 API token secret
//   R2_BUCKET             bucket name, e.g. "realty-listings"
//   R2_PUBLIC_BASE_URL    public read URL base (custom domain or r2.dev), no trailing slash
import { AwsClient } from "aws4fetch";
import { randomBytes } from "crypto";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set — photo storage is not configured`);
  return v;
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

let _client: AwsClient | null = null;
function client(): AwsClient {
  if (_client) return _client;
  _client = new AwsClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    region: "auto",
    service: "s3",
  });
  return _client;
}

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// ID documents may also be PDFs.
const DOC_CONTENT_TYPES = new Set([...ALLOWED_CONTENT_TYPES, "application/pdf"]);

function extFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "jpg";
  }
}

export interface PresignedUpload {
  uploadUrl: string; // PUT here with the raw bytes + matching Content-Type
  objectKey: string; // store this so we can delete later
  publicUrl: string; // the URL to persist on the listing photo
  contentType: string;
  expiresIn: number;
}

// Core: presign a PUT for an arbitrary object key.
async function buildPresign(objectKey: string, contentType: string): Promise<PresignedUpload> {
  const accountId = env("R2_ACCOUNT_ID");
  const bucket = env("R2_BUCKET");
  const publicBase = env("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
  const expiresIn = 600; // 10 minutes

  const endpoint = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${objectKey}`);
  endpoint.searchParams.set("X-Amz-Expires", String(expiresIn));

  // signQuery: put the signature in the URL so the app can PUT with no auth headers.
  const signed = await client().sign(endpoint.toString(), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    aws: { signQuery: true },
  });

  return { uploadUrl: signed.url, objectKey, publicUrl: `${publicBase}/${objectKey}`, contentType, expiresIn };
}

// Build a presigned PUT for a single listing photo.
export async function presignListingPhoto(listingId: string, contentType: string): Promise<PresignedUpload> {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) throw new Error(`Unsupported content type: ${contentType}`);
  return buildPresign(`listings/${listingId}/${randomBytes(12).toString("hex")}.${extFor(contentType)}`, contentType);
}

// Build a presigned PUT for an owner profile asset (photo or ID document).
export async function presignOwnerAsset(
  ownerId: string,
  kind: "photo" | "id",
  contentType: string,
): Promise<PresignedUpload> {
  const allowed = kind === "id" ? DOC_CONTENT_TYPES : ALLOWED_CONTENT_TYPES;
  if (!allowed.has(contentType)) throw new Error(`Unsupported content type: ${contentType}`);
  return buildPresign(`owners/${ownerId}/${kind}/${randomBytes(12).toString("hex")}.${extFor(contentType)}`, contentType);
}
