// POST /api/auth/password/set — authenticated user sets or changes their password.
// Used after accepting a team invite, and from Settings.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  // Required only if a password is already set (changing it).
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Use at least 8 characters").max(200),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const full = await prisma.user.findUnique({ where: { id: user.id } });
    if (full?.passwordHash) {
      // Changing an existing password requires the current one.
      const ok = parsed.data.currentPassword
        ? await verifyPassword(parsed.data.currentPassword, full.passwordHash)
        : false;
      if (!ok) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });

    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "user",
      entityId: user.id,
      action: full?.passwordHash ? "password_changed" : "password_set",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
