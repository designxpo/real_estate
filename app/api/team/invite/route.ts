// POST /api/team/invite — principal/owner invites a teammate.
// Creates the User (role) and a one-time invite link that lets them set a
// password and land in the app. GET returns the current team roster.

import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth";
import { createMagicLink } from "@/lib/magic-link";
import { normalizePhone } from "@/lib/utils";
import { sendOtpSms } from "@/lib/sms";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal("")),
  // Principals may invite sub-brokers, accounts, or other principals — not owners/landlords.
  role: z.enum(["principal", "sub_broker", "accounts"]),
});

export async function GET() {
  try {
    const user = await requireRole("owner", "principal");
    const team = await prisma.user.findMany({
      where: { firmId: user.firmId, role: { in: ["owner", "principal", "sub_broker", "accounts"] } },
      select: { id: true, name: true, phone: true, email: true, role: true, passwordHash: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      team: team.map((t) => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        email: t.email,
        role: t.role,
        hasPassword: !!t.passwordHash,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: e.code === "FORBIDDEN" ? 403 : 401 });
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const inviter = await requireRole("owner", "principal");
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;
    const phone = normalizePhone(data.phone);

    // Phone is globally unique. Reject if taken (by anyone, any firm).
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return NextResponse.json({ error: "A user with that phone already exists" }, { status: 409 });
    }
    if (data.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
      if (existingEmail) return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
    }

    const invitee = await prisma.user.create({
      data: {
        firmId: inviter.firmId,
        name: data.name,
        phone,
        email: data.email ? data.email.toLowerCase() : null,
        role: data.role,
      },
    });

    const { token, expiresAt } = await createMagicLink({
      firmId: inviter.firmId,
      userId: invitee.id,
      purpose: "team_invite",
      ttlDays: 14,
    });

    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const inviteUrl = `${proto}://${host}/api/invite/${token}`;

    await sendOtpSms(phone, `You've been added to ${inviter.name}'s team. Set up your account: ${inviteUrl}`);

    await logActivity({
      firmId: inviter.firmId,
      userId: inviter.id,
      entityType: "user",
      entityId: invitee.id,
      action: "team_invite",
      payload: { role: data.role },
    });

    return NextResponse.json({ ok: true, userId: invitee.id, inviteUrl, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: e.code === "FORBIDDEN" ? 403 : 401 });
    throw e;
  }
}
