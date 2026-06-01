import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { contactVisibility } from "@/lib/scope";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const TYPE_TONES: Record<string, "neutral" | "blue" | "amber" | "green" | "purple"> = {
  buyer: "blue",
  seller: "amber",
  tenant: "purple",
  landlord: "green",
  other: "neutral",
};

export default async function ContactsPage() {
  const user = await requireUserPage();
  const contacts = await prisma.contact.findMany({
    where: contactVisibility(user),
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-ink-muted">{contacts.length} total</p>
        </div>
        <Link href="/contacts/new">
          <Button>+ New contact</Button>
        </Link>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No contacts yet"
          description="Every lead and deal is anchored to a contact. Add buyers, sellers, tenants, or landlords here."
          primaryAction={{ label: "+ Add contact", href: "/contacts/new" }}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-line">
            {contacts.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-hover transition-colors">
                <div>
                  <div className="font-medium text-ink flex items-center gap-2">
                    {c.name}
                    {c.isDemo && <Pill tone="purple" size="xs">DEMO</Pill>}
                  </div>
                  <div className="text-sm text-ink-muted">
                    <a href={`tel:${c.phone}`} className="hover:text-accent">{c.phone}</a>
                    {c.email && ` · ${c.email}`}
                  </div>
                </div>
                <div className="flex gap-1.5 items-center">
                  <Pill tone={TYPE_TONES[c.type]} size="xs">{c.type}</Pill>
                  <span className="text-xs text-ink-faint capitalize hidden sm:inline">
                    {c.source.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
