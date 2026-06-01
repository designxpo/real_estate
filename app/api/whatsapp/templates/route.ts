import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const templates = await prisma.waTemplate.findMany({
      where: { firmId: user.firmId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ templates });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

const schema = z.object({
  // Meta template names: lowercase letters, numbers, underscores.
  name: z.string().regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, underscores"),
  language: z.string().min(2).max(8).default("en"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).default("MARKETING"),
  bodyTemplate: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const template = await prisma.waTemplate.upsert({
      where: { firmId_name_language: { firmId: user.firmId, name: d.name, language: d.language } },
      create: { firmId: user.firmId, name: d.name, language: d.language, category: d.category, bodyTemplate: d.bodyTemplate },
      update: { category: d.category, bodyTemplate: d.bodyTemplate },
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
