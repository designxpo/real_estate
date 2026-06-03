// Broker actions on their own booking: close (deal done) or release (give it up).
//   PATCH { action: "close" | "release" }
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth";
import { closeBooking, releaseBooking, BookingError } from "@/lib/booking";

const schema = z.object({ action: z.enum(["close", "release"]) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    if (parsed.data.action === "close") await closeBooking(id, user.firmId);
    else await releaseBooking(id, user.firmId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    if (e instanceof BookingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "not_found" ? 404 : 409 });
    }
    throw e;
  }
}
