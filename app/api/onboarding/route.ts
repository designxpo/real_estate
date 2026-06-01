import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { seedDemoData, clearDemoData } from "@/lib/sample-data";
import { logActivity } from "@/lib/activity";

const finishSchema = z.object({
  firmName: z.string().min(1).max(200).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  reraNumber: z.string().max(80).optional(),
  gstNumber: z.string().max(40).optional(),
  invoicePrefix: z.string().max(10).optional(),
  withSampleData: z.boolean().optional(),
});

function errorResponse(stage: string, e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  // eslint-disable-next-line no-console
  console.error(`[onboarding] ${stage} failed:`, e);
  return NextResponse.json({ error: `${stage}: ${message}` }, { status: 500 });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    return errorResponse("auth", e);
  }

  const body = await req.json().catch(() => null);
  const parsed = finishSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  try {
    await prisma.firm.update({
      where: { id: user.firmId },
      data: {
        ...(data.firmName ? { name: data.firmName } : {}),
        ...(data.city ? { city: data.city } : {}),
        ...(data.state ? { state: data.state } : {}),
        ...(data.reraNumber ? { reraNumber: data.reraNumber } : {}),
        ...(data.gstNumber ? { gstNumber: data.gstNumber } : {}),
        ...(data.invoicePrefix ? { invoicePrefix: data.invoicePrefix } : {}),
        onboardedAt: new Date(),
      },
    });
  } catch (e) {
    return errorResponse("firm-update", e);
  }

  let seeded = null;
  if (data.withSampleData) {
    try {
      seeded = await seedDemoData(user.firmId, user.id);
    } catch (e) {
      // Don't fail the whole onboarding if seeding fails — the firm is set up.
      // eslint-disable-next-line no-console
      console.error("[onboarding] sample-data failed (non-fatal):", e);
      seeded = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  try {
    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "firm",
      entityId: user.firmId,
      action: "onboard_complete",
      payload: { withSampleData: !!data.withSampleData },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[onboarding] activity log failed (non-fatal):", e);
  }

  return NextResponse.json({ ok: true, seeded });
}

export async function DELETE() {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    return errorResponse("auth", e);
  }
  try {
    const result = await clearDemoData(user.firmId);
    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "firm",
      entityId: user.firmId,
      action: "clear_demo_data",
      payload: result as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true, removed: result });
  } catch (e) {
    return errorResponse("clear-demo", e);
  }
}
