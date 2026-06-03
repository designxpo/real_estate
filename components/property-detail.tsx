import type { ReactNode } from "react";
import Link from "next/link";
import { PropertyGallery } from "@/components/property-gallery";

// Normalized shape so the SAME detail page renders both marketplace listings and
// firm CRM properties (spec §4B). Each surface maps its record into this view.
export interface PropertyView {
  kind: "marketplace" | "property";
  title: string;
  breadcrumb: { city: string; locality?: string | null };
  statusLabel?: string | null;
  statusTone?: "normal" | "high" | "urgent" | "muted";
  photos: string[];
  description?: string | null;
  specs: { label: string; value: string }[];
  availability?: { label: string; value: string }[];
  amenities: string[];
  rera?: { id: string | null; status?: string | null } | null;
}

const TONE: Record<string, string> = {
  normal: "bg-normal-soft text-normal",
  high: "bg-high-soft text-high",
  urgent: "bg-urgent-soft text-urgent",
  muted: "bg-surface-2 text-ink-muted",
};

export function PropertyDetail({
  view,
  aside,
  headerActions,
  children,
}: {
  view: PropertyView;
  aside: ReactNode;
  headerActions?: ReactNode;
  children?: ReactNode;
}) {
  const loc = [view.breadcrumb.locality, view.breadcrumb.city].filter(Boolean).join(", ");
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href={view.kind === "marketplace" ? "/marketplace" : "/properties"} className="hover:text-ink">
          {view.kind === "marketplace" ? "Marketplace" : "Properties"}
        </Link>
        <span>›</span>
        <span className="text-ink-soft">{view.breadcrumb.city}</span>
        {view.breadcrumb.locality && (
          <>
            <span>›</span>
            <span className="text-ink-soft">{view.breadcrumb.locality}</span>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-[1.62fr_1fr] gap-8 items-start">
        {/* MAIN */}
        <div className="space-y-7 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink leading-tight">{view.title}</h1>
              <p className="text-ink-muted mt-1">{loc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {view.statusLabel && (
                <span className={`text-xs px-2.5 py-1 rounded-full ${TONE[view.statusTone ?? "normal"]}`}>
                  {view.statusLabel}
                </span>
              )}
              {headerActions}
            </div>
          </div>

          <PropertyGallery photos={view.photos} title={view.title} />

          {/* Spec strip */}
          {view.specs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-line rounded-lg overflow-hidden border border-line">
              {view.specs.map((s) => (
                <div key={s.label} className="bg-surface px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-ink-muted">{s.label}</div>
                  <div className="text-sm font-medium text-ink tabular-nums mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Availability */}
          {view.availability && view.availability.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-ink mb-3">Availability</h2>
              <div className="flex flex-wrap gap-x-10 gap-y-3">
                {view.availability.map((a) => (
                  <div key={a.label}>
                    <div className="text-xs text-ink-muted">{a.label}</div>
                    <div className="text-sm font-medium text-ink tabular-nums">{a.value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* About */}
          {view.description && (
            <section>
              <h2 className="text-lg font-semibold text-ink mb-2">About this property</h2>
              <p className="text-ink-soft leading-relaxed whitespace-pre-line">{view.description}</p>
            </section>
          )}

          {/* Amenities */}
          {view.amenities.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-ink mb-3">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {view.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm text-ink-soft bg-surface border border-line rounded-md px-3 py-2">
                    <span className="text-accent">✓</span>
                    {a}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* RERA */}
          {view.rera && (
            <section className="rounded-lg border border-line bg-gold-soft/60 p-4">
              <div className="flex items-center gap-2">
                <span className="text-gold font-semibold text-sm">RERA</span>
                {view.rera.status && <span className="text-xs text-ink-muted">· {view.rera.status}</span>}
              </div>
              <div className="text-sm text-ink mt-1 tabular-nums">
                {view.rera.id ? `Registration: ${view.rera.id}` : "RERA registration not provided for this listing."}
              </div>
            </section>
          )}

          {children}
        </div>

        {/* ASIDE (sticky enquiry/booking widget) */}
        <aside className="lg:sticky lg:top-6">{aside}</aside>
      </div>
    </div>
  );
}
