import { revokeRefreshToken } from "@/lib/owner-auth";
import { ownerRefreshSchema } from "@/lib/owner-validators";
import { ok, fail, preflight } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

// Revoke the refresh token for this device. Access tokens expire on their own.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ownerRefreshSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request", 400);
  await revokeRefreshToken(parsed.data.refreshToken);
  return ok({ ok: true });
}
