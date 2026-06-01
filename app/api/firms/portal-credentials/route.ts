// Owner/principal-only management of encrypted portal API credentials.
// GET never returns plaintext — only a hasApiKey boolean.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { ALL_PORTALS } from "@/lib/portals";
import type { PortalId } from "@prisma/client";

export async function GET() {
  try {
    const user = await requireRole("owner", "principal");
    const stored = await prisma.portalCredential.findMany({ where: { firmId: user.firmId } });
    const byPortal = new Map(stored.map((c) => [c.portal, c]));
    const credentials = ALL_PORTALS.map((p) => {
      const c = byPortal.get(p.id);
      return {
        portal: p.id,
        displayName: p.displayName,
        hasApiKey: Boolean(c?.apiKeyCipher),
        brokerCode: c?.brokerCode ?? null,
        lastUsedAt: c?.lastUsedAt ? c.lastUsedAt.toISOString() : null,
      };
    });
    return NextResponse.json({ credentials });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: e.code === "FORBIDDEN" ? 403 : 401 });
    throw e;
  }
}

const schema = z.object({
  portal: z.enum(["ninetynine_acres", "magicbricks", "housing", "olx", "custom_csv", "custom_xml"]),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  brokerCode: z.string().optional(),
  baseUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const user = await requireRole("owner", "principal");
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const portal = d.portal as PortalId;

    const data = {
      brokerCode: d.brokerCode,
      baseUrl: d.baseUrl || null,
      ...(d.apiKey ? { apiKeyCipher: encrypt(d.apiKey) } : {}),
      ...(d.apiSecret ? { apiSecretCipher: encrypt(d.apiSecret) } : {}),
    };

    const cred = await prisma.portalCredential.upsert({
      where: { firmId_portal: { firmId: user.firmId, portal } },
      create: { firmId: user.firmId, portal, ...data },
      update: data,
    });
    return NextResponse.json({ ok: true, portal: cred.portal, hasApiKey: Boolean(cred.apiKeyCipher) });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: e.code === "FORBIDDEN" ? 403 : 401 });
    throw e;
  }
}
