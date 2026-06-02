// Register/refresh an FCM device token for the authenticated owner.
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

const schema = z.object({
  token: z.string().min(10),
  platform: z.enum(["android", "ios", "web"]).default("android"),
});

export async function POST(req: Request) {
  return withOwner(req, async (owner) => {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400);

    // Token is globally unique; upsert and (re)bind it to this owner.
    await prisma.ownerDevice.upsert({
      where: { token: parsed.data.token },
      create: { ownerId: owner.id, token: parsed.data.token, platform: parsed.data.platform },
      update: { ownerId: owner.id, platform: parsed.data.platform },
    });
    return ok({ ok: true });
  });
}
