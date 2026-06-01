import { prisma } from "@/lib/db";
import { ownerProfileUpdateSchema } from "@/lib/owner-validators";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

function serialize(o: { id: string; name: string; phone: string; email: string | null; verifiedAt: Date | null }) {
  return { id: o.id, name: o.name, phone: o.phone, email: o.email, verified: !!o.verifiedAt };
}

export async function GET(req: Request) {
  return withOwner(req, async (owner) => ok(serialize(owner)));
}

export async function PATCH(req: Request) {
  return withOwner(req, async (owner) => {
    const body = await req.json().catch(() => null);
    const parsed = ownerProfileUpdateSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());
    const { name, email } = parsed.data;
    const updated = await prisma.owner.update({
      where: { id: owner.id },
      data: { ...(name ? { name } : {}), ...(email !== undefined ? { email: email || null } : {}) },
    });
    return ok(serialize(updated));
  });
}
