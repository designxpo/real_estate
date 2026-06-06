// Broker books a live listing: they have a buyer and claim the owner's exclusive
// close window. No contact is revealed — coordination happens on-platform (chat).
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth";
import { bookListing, BookingError, daysLeft } from "@/lib/booking";
import { phoneSchema } from "@/lib/validators";

const bookSchema = z.object({
  buyer: z.object({
    name: z.string().min(1).max(120),
    phone: phoneSchema,
    intent: z.enum(["buy", "rent", "invest"]).optional(),
  }),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const booking = await bookListing({
      listingId: id,
      firmId: user.firmId,
      userId: user.id,
      buyer: parsed.data.buyer,
    });

    return NextResponse.json({
      ok: true,
      booking: {
        id: booking.id,
        status: booking.status,
        windowDays: booking.windowDays,
        expiresAt: booking.expiresAt,
        daysLeft: daysLeft(booking.expiresAt),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    if (e instanceof BookingError) {
      const status = e.code === "cap_reached" ? 402 : e.code === "not_found" ? 404 : 409;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
