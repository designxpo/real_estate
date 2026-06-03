// Presign a PUT for an owner profile asset (profile photo or KYC ID document).
// The app uploads the bytes to R2 with this URL, then PATCHes /me with the
// returned publicUrl (photoUrl / idDocUrl).
import { presignOwnerAsset, isR2Configured } from "@/lib/r2";
import { ownerAssetPresignSchema } from "@/lib/owner-validators";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  return withOwner(req, async (owner) => {
    if (!isR2Configured()) return fail("File storage not configured", 503);
    const body = await req.json().catch(() => null);
    const parsed = ownerAssetPresignSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());
    const presigned = await presignOwnerAsset(owner.id, parsed.data.kind, parsed.data.contentType);
    return ok(presigned);
  });
}
