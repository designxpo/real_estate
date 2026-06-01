import { refreshAccessToken } from "@/lib/owner-auth";
import { ownerRefreshSchema } from "@/lib/owner-validators";
import { ok, fail, preflight } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ownerRefreshSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request", 400);

  const result = await refreshAccessToken(parsed.data.refreshToken);
  if (!result) return fail("Invalid or expired refresh token", 401);
  return ok(result);
}
