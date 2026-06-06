// Send a broadcast to a resolved segment.
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth";
import { runBroadcast } from "@/lib/broadcast";

const schema = z.object({
  segment: z.enum(["tenants", "leads", "team"]),
  filter: z.string().max(160).optional(),
  channel: z.enum(["whatsapp", "sms"]),
  body: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role === "sub_broker") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const { broadcastId, result } = await runBroadcast({
      firmId: user.firmId,
      userId: user.id,
      segment: d.segment,
      filter: d.filter,
      channel: d.channel,
      body: d.body,
    });
    return NextResponse.json({ ok: true, broadcastId, ...result });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
