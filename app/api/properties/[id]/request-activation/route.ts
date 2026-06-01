// POST /api/properties/:id/request-activation
//
// Broker action. Assigns (or creates) the landlord User for this property,
// moves the property draft -> pending, mints a magic link, logs the status
// change, and returns the link to send to the landlord.

import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth";
import { propertyVisibility } from "@/lib/scope";
import { createMagicLink, magicLinkUrl } from "@/lib/magic-link";
import { logActivity } from "@/lib/activity";
import { normalizePhone } from "@/lib/utils";
import { sendOtpSms } from "@/lib/sms";

const schema = z.object({
  // Either link an existing landlord User, or create one from these details.
  landlordUserId: z.string().optional(),
  landlordName: z.string().min(1).max(120).optional(),
  landlordPhone: z.string().min(8).max(20).optional(),
  landlordEmail: z.string().email().optional().or(z.literal("")),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Only brokers (owner/principal/sub_broker) can request activation.
    const user = await requireRole("owner", "principal", "sub_broker");
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body ?? {});
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;

    const property = await prisma.property.findFirst({
      where: { id, ...propertyVisibility(user) },
    });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    // Resolve the landlord User (role=landlord), scoped to this firm.
    let landlordId = data.landlordUserId ?? property.landlordUserId ?? null;
    if (landlordId) {
      const existing = await prisma.user.findFirst({
        where: { id: landlordId, firmId: user.firmId, role: "landlord" },
      });
      if (!existing) return NextResponse.json({ error: "Landlord not in firm" }, { status: 400 });
    } else {
      if (!data.landlordName || !data.landlordPhone) {
        return NextResponse.json(
          { error: "Provide landlordUserId OR (landlordName + landlordPhone)" },
          { status: 400 }
        );
      }
      const phone = normalizePhone(data.landlordPhone);
      // A landlord may already exist (same phone). Reuse if so; else create.
      const found = await prisma.user.findUnique({ where: { phone } });
      if (found) {
        if (found.firmId !== user.firmId) {
          return NextResponse.json(
            { error: "That phone belongs to a user in another firm" },
            { status: 409 }
          );
        }
        landlordId = found.id;
      } else {
        const created = await prisma.user.create({
          data: {
            firmId: user.firmId,
            name: data.landlordName,
            phone,
            email: data.landlordEmail || null,
            role: "landlord",
          },
        });
        landlordId = created.id;
      }
    }

    const previousStatus = property.status;

    // Assign landlord + move to pending in one transaction, with the audit log.
    await prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id: property.id },
        data: {
          landlordUserId: landlordId,
          status: "pending",
          // Pending listings are not public until the landlord confirms.
          publicEnabled: false,
        },
      });
      await tx.propertyStatusLog.create({
        data: {
          firmId: user.firmId,
          propertyId: property.id,
          changedByUserId: user.id,
          previousStatus,
          newStatus: "pending",
          source: "broker",
          note: "Activation requested; awaiting landlord confirmation.",
        },
      });
    });

    const { token, expiresAt } = await createMagicLink({
      firmId: user.firmId,
      userId: landlordId!,
      propertyId: property.id,
    });

    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const url = magicLinkUrl(`${proto}://${host}`, token);

    // Notify the landlord (dev: logs to console, prod: MSG91 — same path as OTP).
    const landlord = await prisma.user.findUnique({ where: { id: landlordId! } });
    if (landlord) {
      await sendOtpSms(
        landlord.phone,
        `Confirm your property listing: ${url}`
      );
    }

    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "property",
      entityId: property.id,
      action: "request_activation",
      payload: { landlordUserId: landlordId, expiresAt: expiresAt.toISOString() },
    });

    return NextResponse.json({
      ok: true,
      landlordUserId: landlordId,
      magicLinkUrl: url,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.code }, { status: e.code === "FORBIDDEN" ? 403 : 401 });
    }
    throw e;
  }
}
