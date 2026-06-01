import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { sendTemplateMessage, renderTemplate } from "@/lib/whatsapp";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  contactId: z.string(),
  templateId: z.string(),
  variables: z.array(z.string()).optional(),
  leadId: z.string().optional(),
  propertyId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const [contact, template] = await Promise.all([
      prisma.contact.findFirst({ where: { id: d.contactId, firmId: user.firmId } }),
      prisma.waTemplate.findFirst({ where: { id: d.templateId, firmId: user.firmId } }),
    ]);
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    // Hard gate: MARKETING templates require opt-in.
    if (template.category === "MARKETING" && !contact.whatsappOptIn) {
      return NextResponse.json({ error: "Contact has not opted in to marketing messages" }, { status: 403 });
    }

    const toPhone = contact.phone.replace(/^\+/, "");
    const message = await prisma.waMessage.create({
      data: {
        firmId: user.firmId,
        contactId: contact.id,
        toPhone,
        direction: "outbound",
        status: "queued",
        templateId: template.id,
        templateVars: d.variables ?? [],
        bodyText: renderTemplate(template.bodyTemplate, d.variables ?? []),
        leadId: d.leadId,
        propertyId: d.propertyId,
      },
    });

    const result = await sendTemplateMessage({
      to: toPhone,
      templateName: template.name,
      language: template.language,
      variables: d.variables,
    });

    const updated = await prisma.waMessage.update({
      where: { id: message.id },
      data: {
        status: result.ok ? "sent" : "failed",
        metaMessageId: result.messageId,
        errorMessage: result.error,
      },
    });

    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "wa_message",
      entityId: updated.id,
      action: result.ok ? "wa_sent" : "wa_failed",
    });
    return NextResponse.json({ ok: result.ok, message: updated }, { status: result.ok ? 200 : 502 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
