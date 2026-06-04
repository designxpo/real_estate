// Owner Google sign-in: the app sends a Google ID token (from google_sign_in
// configured with our Web client id as serverClientId). We verify it with Google,
// then find-or-create the owner and issue our own JWT pair. Gated on
// GOOGLE_CLIENT_ID — dev-ready until that's set.
import { prisma } from "@/lib/db";
import { z } from "zod";
import { issueTokens } from "@/lib/owner-auth";
import { ok, fail, preflight } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

const schema = z.object({ idToken: z.string().min(20), device: z.string().max(120).optional() });

interface TokenInfo {
  aud: string;
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
}

export async function POST(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return fail("Google sign-in is not configured", 503);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request", 400);

  // Verify the ID token with Google.
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(parsed.data.idToken)}`);
  if (!res.ok) return fail("Invalid Google token", 401);
  const info = (await res.json()) as TokenInfo;

  const audiences = [clientId, ...(process.env.GOOGLE_OAUTH_AUDIENCES?.split(",") ?? [])].map((s) => s.trim());
  if (!audiences.includes(info.aud)) return fail("Token audience mismatch", 401);
  if (info.email_verified !== true && info.email_verified !== "true") return fail("Email not verified", 401);
  if (!info.email) return fail("No email on token", 401);

  const email = info.email.toLowerCase();
  const sub = info.sub;

  let owner = await prisma.owner.findUnique({ where: { googleId: sub } });
  if (!owner) owner = await prisma.owner.findFirst({ where: { email } });
  let isNewOwner = false;

  if (owner) {
    if (!owner.googleId) {
      owner = await prisma.owner.update({
        where: { id: owner.id },
        data: { googleId: sub, photoUrl: owner.photoUrl ?? info.picture ?? null },
      });
    }
  } else {
    isNewOwner = true;
    owner = await prisma.owner.create({
      data: {
        name: info.name || email.split("@")[0],
        email,
        googleId: sub,
        // Owners normally log in by phone; Google owners get a placeholder until set.
        phone: `google:${sub}`,
        photoUrl: info.picture ?? null,
      },
    });
  }

  const tokens = await issueTokens(owner.id, parsed.data.device);
  return ok({
    ...tokens,
    isNewOwner,
    owner: { id: owner.id, name: owner.name, phone: owner.phone, email: owner.email, verified: !!owner.verifiedAt },
  });
}
