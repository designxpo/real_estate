// POST /api/auth/signup — public broker registration. Creates the firm + the
// owner user (email/phone + password) with India KYC/legal details. Verification
// is progressive: the firm starts "pending" and can use the platform immediately.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, homePathForRole } from "@/lib/auth";
import { brokerSignupSchema } from "@/lib/validators";
import { normalizePhone } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = brokerSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const email = d.email.toLowerCase();
  const phone = normalizePhone(d.phone);

  // Uniqueness — friendly, specific errors.
  const [emailTaken, phoneTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { phone } }),
  ]);
  if (emailTaken) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  if (phoneTaken) return NextResponse.json({ error: "An account with this phone already exists" }, { status: 409 });

  const passwordHash = await hashPassword(d.password);

  const user = await prisma.$transaction(async (tx) => {
    const firm = await tx.firm.create({
      data: {
        name: d.firmName,
        firmType: d.firmType,
        reraNumber: d.reraNumber || null,
        reraAuthority: d.reraAuthority || null,
        panNumber: d.panNumber ? d.panNumber.toUpperCase() : null,
        gstNumber: d.gstNumber ? d.gstNumber.toUpperCase() : null,
        address: d.address || null,
        city: d.city || null,
        state: d.state || null,
        pincode: d.pincode || null,
        website: d.website || null,
        verificationStatus: "pending",
      },
    });
    const owner = await tx.user.create({
      data: { firmId: firm.id, name: d.name, phone, email, role: "owner", passwordHash },
    });
    await tx.firm.update({ where: { id: firm.id }, data: { ownerUserId: owner.id } });
    return owner;
  });

  await logActivity({ firmId: user.firmId, userId: user.id, entityType: "user", entityId: user.id, action: "signup" });
  await createSession(user.id);
  return NextResponse.json({ ok: true, redirectTo: homePathForRole(user.role) }, { status: 201 });
}
