// Brokers engaging this owner's listing — the owner's "interested brokers" view.
// Booking model: a broker who has a buyer books the listing (exclusive window).
// We never expose the broker's phone — coordination stays on-platform (chat).
import { prisma } from "@/lib/db";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";
import { daysLeft } from "@/lib/booking";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async (owner) => {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!listing || listing.ownerId !== owner.id) return fail("Listing not found", 404);

    const bookings = await prisma.listingBooking.findMany({
      where: { listingId: id },
      orderBy: { bookedAt: "desc" },
      include: { firm: { select: { name: true } } },
    });
    if (bookings.length === 0) return ok({ inquiries: [] });

    const userIds = [...new Set(bookings.map((b) => b.userId))];
    const leadIds = bookings.map((b) => b.leadId).filter((x): x is string => !!x);
    const [users, leads] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
      prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, stage: true } }),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const stageMap = new Map(leads.map((l) => [l.id, l.stage]));

    const inquiries = bookings.map((b) => ({
      brokerName: userMap.get(b.userId)?.name ?? "Broker",
      brokerPhone: null, // on-platform only — no off-platform contact
      firmId: b.firmId,
      firmName: b.firm.name,
      unlockedAt: b.bookedAt,
      bookingStatus: b.status, // active / closed / expired / cancelled
      daysLeft: b.status === "active" ? daysLeft(b.expiresAt) : null,
      leadStage: b.leadId ? stageMap.get(b.leadId) ?? null : null,
    }));
    return ok({ inquiries });
  });
}
