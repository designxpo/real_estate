// PATCH /api/properties/:id/status
//
// Toggles a property's status with full state-machine enforcement.
// Two actor paths, both authenticated by the standard session cookie:
//   - Landlord (role=landlord): may only act on the property they own, and only
//     the transitions allowed by the state machine (pending->active, active<->booked).
//   - Broker (owner/principal/sub_broker): firm-scoped, broader transitions.
// Every change writes an immutable PropertyStatusLog row.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { propertyVisibility } from "@/lib/scope";
import { canTransition, publicEnabledFor, type Actor } from "@/lib/property-status";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";

const schema = z.object({
  status: z.enum(["draft", "pending", "active", "booked", "inactive", "under_offer", "closed", "withdrawn"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const targetStatus = parsed.data.status;

    const isLandlord = user.role === "landlord";
    const actor: Actor = isLandlord ? "landlord" : "broker";

    // Authorization + fetch the property under the right scope.
    const property = isLandlord
      ? await prisma.property.findFirst({ where: { id, landlordUserId: user.id } })
      : await prisma.property.findFirst({ where: { id, ...propertyVisibility(user) } });

    if (!property) {
      return NextResponse.json({ error: "Property not found or not yours" }, { status: 404 });
    }

    if (!canTransition(actor, property.status, targetStatus)) {
      return NextResponse.json(
        {
          error: `Illegal transition for ${actor}: ${property.status} → ${targetStatus}`,
        },
        { status: 422 }
      );
    }

    const previousStatus = property.status;
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.property.update({
        where: { id: property.id },
        data: {
          status: targetStatus,
          // Auto-archive the public listing when booked; re-enable when active.
          publicEnabled: publicEnabledFor(targetStatus),
        },
      });
      await tx.propertyStatusLog.create({
        data: {
          firmId: property.firmId,
          propertyId: property.id,
          changedByUserId: user.id,
          previousStatus,
          newStatus: targetStatus,
          source: actor,
          note: parsed.data.note,
        },
      });
      return u;
    });

    await logActivity({
      firmId: property.firmId,
      userId: user.id,
      entityType: "property",
      entityId: property.id,
      action: "status_change",
      payload: { from: previousStatus, to: targetStatus, by: actor },
    });

    // When a landlord acts, notify the listing broker so the team sees it live.
    if (isLandlord && property.listedByUserId) {
      const label = targetStatus === "active" ? "is now Active" : targetStatus === "booked" ? "was marked Booked" : `→ ${targetStatus}`;
      await notify({
        firmId: property.firmId,
        userId: property.listedByUserId,
        kind: "system",
        title: `Landlord update: ${property.title}`,
        body: `The owner ${label}.`,
        href: `/properties/${property.id}`,
      });
    }

    return NextResponse.json({ ok: true, status: updated.status, publicEnabled: updated.publicEnabled });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.code }, { status: e.code === "FORBIDDEN" ? 403 : 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
