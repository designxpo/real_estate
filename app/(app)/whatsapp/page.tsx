import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { isWhatsappConfigured } from "@/lib/whatsapp";
import { WaTemplateManager } from "@/components/wa-template-manager";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  const user = await requireUserPage();
  const [templates, messages] = await Promise.all([
    prisma.waTemplate.findMany({ where: { firmId: user.firmId }, orderBy: { createdAt: "desc" } }),
    prisma.waMessage.findMany({
      where: { firmId: user.firmId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { contact: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
      {!isWhatsappConfigured() && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300">
          WhatsApp is not configured. Set WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN,
          WHATSAPP_APP_SECRET and WHATSAPP_VERIFY_TOKEN to send live messages.
        </div>
      )}

      <WaTemplateManager templates={templates} />

      <div className="bg-surface border border-line rounded-lg p-4">
        <h2 className="font-semibold mb-2">Recent messages</h2>
        {messages.length === 0 ? (
          <div className="text-sm text-ink-faint">No messages yet.</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {messages.map((m) => (
              <li key={m.id} className="flex justify-between border-b border-line/50 py-1.5">
                <span className="text-ink">
                  {m.direction === "outbound" ? "→" : "←"} {m.contact?.name ?? m.toPhone}
                </span>
                <span className="text-ink-faint text-xs">{m.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
