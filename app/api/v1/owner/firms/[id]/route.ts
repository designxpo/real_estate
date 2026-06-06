// Broker firm's PUBLIC profile, shown to owners to build trust (RERA, verified
// badge, track record). Exposes only trust fields — no internal CRM data.
import { prisma } from "@/lib/db";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async () => {
    const firm = await prisma.firm.findUnique({
      where: { id },
      select: {
        id: true, name: true, firmType: true, city: true, state: true,
        reraNumber: true, reraAuthority: true, website: true, about: true,
        verificationStatus: true, createdAt: true, ownerUserId: true, suspendedAt: true,
      },
    });
    if (!firm) return fail("Broker not found", 404);

    // Principal broker: the firm's owner user (fallback: any owner-role user).
    const principal = firm.ownerUserId
      ? await prisma.user.findUnique({ where: { id: firm.ownerUserId }, select: { name: true, photoUrl: true } })
      : await prisma.user.findFirst({ where: { firmId: id, role: "owner" }, select: { name: true, photoUrl: true } });

    const dealsClosed = await prisma.deal.count({ where: { firmId: id, stage: "completed" } });

    return ok({
      id: firm.id,
      name: firm.name,
      firmType: firm.firmType,
      city: firm.city,
      state: firm.state,
      reraNumber: firm.reraNumber,
      reraAuthority: firm.reraAuthority,
      website: firm.website,
      about: firm.about,
      verified: firm.verificationStatus === "verified",
      active: !firm.suspendedAt,
      brokerName: principal?.name ?? null,
      brokerPhotoUrl: principal?.photoUrl ?? null,
      dealsClosed,
      memberSince: firm.createdAt,
    });
  });
}
