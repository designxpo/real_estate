import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { propertyVisibility } from "@/lib/scope";
import { formatINR } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const STATUS_TONES: Record<string, "neutral" | "blue" | "amber" | "green" | "red"> = {
  draft: "neutral",
  active: "green",
  under_offer: "amber",
  closed: "blue",
  withdrawn: "red",
};

export default async function PropertiesPage() {
  const user = await requireUserPage();
  const properties = await prisma.property.findMany({
    where: propertyVisibility(user),
    orderBy: { createdAt: "desc" },
    include: { photos: { take: 1, orderBy: { position: "asc" } } },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
          <p className="text-sm text-ink-muted">{properties.length} listings</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/exports/properties"
            className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 h-10 text-sm font-medium bg-surface-2 text-ink hover:bg-surface-3 border border-line"
          >
            ⬇ CSV
          </a>
          <Link href="/properties/new">
            <Button>+ New property</Button>
          </Link>
        </div>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="No properties yet"
          description="Add your first listing. We'll auto-generate a shareable WhatsApp card and a public detail page."
          primaryAction={{ label: "+ Add property", href: "/properties/new" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="group rounded-card border border-line bg-surface overflow-hidden hover:border-line-strong transition-colors"
            >
              <div className="aspect-video bg-surface-2 flex items-center justify-center text-ink-faint relative">
                {p.photos[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photos[0].url} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🏠</span>
                )}
                {p.isDemo && (
                  <span className="absolute top-2 left-2">
                    <Pill tone="purple" size="xs">DEMO</Pill>
                  </span>
                )}
                <span className="absolute top-2 right-2">
                  <Pill tone={STATUS_TONES[p.status] ?? "neutral"} size="xs">{p.status.replace(/_/g, " ")}</Pill>
                </span>
              </div>
              <div className="p-3 space-y-1">
                <div className="font-medium text-ink line-clamp-1 group-hover:text-accent transition-colors">
                  {p.title}
                </div>
                <div className="text-sm text-ink-muted truncate">
                  {p.bhk ? `${p.bhk} BHK · ` : ""}
                  {p.locality ? `${p.locality}, ` : ""}
                  {p.city}
                </div>
                <div className="text-accent-glow font-semibold tabular-nums">
                  {formatINR(p.priceAmount.toString(), p.priceUnit)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
