import { prisma } from "@/lib/db";
import { ownerProfileUpdateSchema } from "@/lib/owner-validators";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";
import type { Owner } from "@prisma/client";

export function OPTIONS() {
  return preflight();
}

function serialize(o: Owner) {
  return {
    id: o.id,
    name: o.name,
    phone: o.phone,
    email: o.email,
    photoUrl: o.photoUrl,
    panNumber: o.panNumber,
    aadhaarLast4: o.aadhaarLast4,
    address: {
      addressLine: o.addressLine,
      locality: o.locality,
      city: o.city,
      state: o.state,
      pincode: o.pincode,
    },
    ownershipType: o.ownershipType,
    idDocUrl: o.idDocUrl,
    kycStatus: o.kycStatus,
    verified: !!o.verifiedAt,
  };
}

export async function GET(req: Request) {
  return withOwner(req, async (owner) => ok(serialize(owner)));
}

const SCALARS = [
  "name", "email", "photoUrl", "addressLine", "locality", "city", "state", "pincode", "ownershipType", "idDocUrl",
] as const;

export async function PATCH(req: Request) {
  return withOwner(req, async (owner) => {
    const body = await req.json().catch(() => null);
    const parsed = ownerProfileUpdateSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());
    const d = parsed.data;

    const data: Record<string, unknown> = {};
    for (const k of SCALARS) {
      if (d[k] !== undefined) data[k] = d[k] === "" ? null : d[k];
    }
    if (d.panNumber !== undefined) data.panNumber = d.panNumber ? d.panNumber.toUpperCase() : null;
    if (d.aadhaarLast4 !== undefined) data.aadhaarLast4 = d.aadhaarLast4 || null;

    // Once core KYC is present, move pending → submitted (awaiting review).
    const merged = { ...owner, ...data } as Owner;
    if (owner.kycStatus === "pending" && merged.panNumber && merged.addressLine && merged.idDocUrl) {
      data.kycStatus = "submitted";
    }

    const updated = await prisma.owner.update({ where: { id: owner.id }, data });
    return ok(serialize(updated));
  });
}
