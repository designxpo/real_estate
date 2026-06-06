import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const invoice = await prisma.invoice.findFirst({
      where: { id, firmId: user.firmId },
      include: { deal: true, contact: true, firm: true },
    });
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ invoice });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const patchSchema = z.object({ status: z.enum(["draft", "sent", "paid", "overdue"]) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const existing = await prisma.invoice.findFirst({ where: { id, firmId: user.firmId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: parsed.data.status, paidAt: parsed.data.status === "paid" ? new Date() : null },
    });
    return NextResponse.json({ invoice });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
