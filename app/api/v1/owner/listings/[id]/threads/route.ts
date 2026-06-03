// Owner's chat inbox for one listing: a thread per broker firm engaging them.
import { prisma } from "@/lib/db";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async (owner) => {
    const listing = await prisma.marketplaceListing.findUnique({ where: { id }, select: { ownerId: true } });
    if (!listing || listing.ownerId !== owner.id) return fail("Listing not found", 404);

    const threads = await prisma.listingThread.findMany({
      where: { listingId: id, ownerId: owner.id },
      orderBy: { lastMessageAt: "desc" },
      include: {
        firm: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderType: true, createdAt: true } },
      },
    });

    return ok({
      threads: threads.map((t) => ({
        id: t.id,
        firmName: t.firm.name,
        unread: t.ownerUnread,
        lastMessageAt: t.lastMessageAt,
        lastMessage: t.messages[0]
          ? { body: t.messages[0].body, senderType: t.messages[0].senderType, createdAt: t.messages[0].createdAt }
          : null,
      })),
    });
  });
}
