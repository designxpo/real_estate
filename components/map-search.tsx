"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Listing = {
  id: string;
  title: string;
  priceLabel: string;
  lat: number | null;
  lng: number | null;
  bhk: number | null;
  propertyType: string;
  listingType: string;
  locality: string | null;
  city: string | null;
  photo: string | null;
  booking: { byMyFirm: boolean; daysLeft: number } | null;
};

type Filters = {
  mode: string; q: string; city: string; propertyType: string;
  bhk: string; budgetMin: string; budgetMax: string; rera: boolean;
};

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

const MODES = [["buy", "Buy"], ["rent", "Rent"], ["lease", "Lease / PG"]];
const PROPERTY_TYPES = [
  ["", "Any type"], ["apartment", "Apartment"], ["villa", "Villa"], ["plot", "Plot / Land"],
  ["office", "Office"], ["shop", "Shop"], ["warehouse", "Warehouse"],
];

export function MapSearch({ listings, withCoords, filters }: { listings: Listing[]; withCoords: number; filters: Filters }) {
  const router = useRouter();
  const mapEl = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markers = useRef<Array<{ id: string; el: HTMLElement }>>([]);
  const [active, setActive] = useState<string | null>(null);

  // Local filter state (seeded from URL); Apply navigates.
  const [f, setF] = useState<Filters>(filters);

  function apply(next: Partial<Filters>) {
    const merged = { ...f, ...next };
    const qs = new URLSearchParams();
    if (merged.mode) qs.set("mode", merged.mode);
    if (merged.q) qs.set("q", merged.q);
    if (merged.city) qs.set("city", merged.city);
    if (merged.propertyType) qs.set("propertyType", merged.propertyType);
    if (merged.bhk) qs.set("bhk", merged.bhk);
    if (merged.budgetMin) qs.set("budgetMin", merged.budgetMin);
    if (merged.budgetMax) qs.set("budgetMax", merged.budgetMax);
    if (merged.rera) qs.set("rera", "1");
    router.push(`/search?${qs.toString()}`);
  }

  // Init map once on mount (filter changes navigate → remount with new props).
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !mapEl.current) return;
      map = new maplibre.Map({
        container: mapEl.current,
        style: OSM_STYLE,
        center: [78.96, 22.59],
        zoom: 4,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

      const pts = listings.filter((l) => l.lat != null && l.lng != null);
      markers.current = [];
      const bounds = new maplibre.LngLatBounds();
      for (const l of pts) {
        const el = document.createElement("button");
        el.className = "ms-pin";
        el.textContent = l.priceLabel;
        el.onclick = (e) => {
          e.stopPropagation();
          setActive(l.id);
          document.getElementById(`card-${l.id}`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        };
        new maplibre.Marker({ element: el }).setLngLat([l.lng!, l.lat!]).addTo(map);
        markers.current.push({ id: l.id, el });
        bounds.extend([l.lng!, l.lat!]);
      }
      if (pts.length === 1) {
        map.setCenter([pts[0].lng!, pts[0].lat!]);
        map.setZoom(13);
      } else if (pts.length > 1) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect the active selection on the pins.
  useEffect(() => {
    for (const m of markers.current) m.el.classList.toggle("ms-pin--active", m.id === active);
  }, [active]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-130px)]">
      {/* Filter rail */}
      <aside className="lg:w-80 shrink-0 overflow-y-auto space-y-4 lg:pr-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Map search</h1>
          <Link href="/marketplace" className="text-xs text-ink-muted hover:text-ink">List view →</Link>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 rounded-full bg-surface-2 border border-line">
          {MODES.map(([v, label]) => (
            <button
              key={v}
              onClick={() => apply({ mode: v })}
              className={`flex-1 h-9 rounded-full text-sm font-medium transition-colors ${f.mode === v ? "bg-accent text-white" : "text-ink-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          value={f.q}
          onChange={(e) => setF({ ...f, q: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && apply({})}
          placeholder="Search title / locality"
          className="w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink"
        />
        <input
          value={f.city}
          onChange={(e) => setF({ ...f, city: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && apply({})}
          placeholder="City"
          className="w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink"
        />

        <div>
          <label className="block text-xs text-ink-muted mb-1">Property type</label>
          <select value={f.propertyType} onChange={(e) => setF({ ...f, propertyType: e.target.value })} className="w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink">
            {PROPERTY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-ink-muted mb-1">Budget {f.mode === "rent" ? "(₹/month)" : "(₹ total)"}</label>
          <div className="flex gap-2">
            <input value={f.budgetMin} onChange={(e) => setF({ ...f, budgetMin: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="Min" className="w-1/2 bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink" />
            <input value={f.budgetMax} onChange={(e) => setF({ ...f, budgetMax: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="Max" className="w-1/2 bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-ink-muted mb-1">BHK</label>
          <div className="flex gap-1.5">
            {["", "1", "2", "3", "4", "5"].map((b) => (
              <button
                key={b || "any"}
                onClick={() => setF({ ...f, bhk: b })}
                className={`flex-1 h-9 rounded-inner text-sm border ${f.bhk === b ? "bg-accent text-white border-accent" : "border-line text-ink-muted hover:text-ink"}`}
              >
                {b === "" ? "Any" : b === "5" ? "5+" : b}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={f.rera} onChange={(e) => setF({ ...f, rera: e.target.checked })} /> RERA-registered only
        </label>

        <button onClick={() => apply({})} className="w-full text-sm px-4 py-2.5 rounded-inner bg-accent text-white">
          Apply filters
        </button>
        <p className="text-[11px] text-ink-faint">
          {listings.length} match{listings.length === 1 ? "" : "es"} · {withCoords} on map
        </p>
      </aside>

      {/* Map + synced cards */}
      <div className="relative flex-1 rounded-lg overflow-hidden border border-line min-h-[360px]">
        <div ref={mapEl} className="absolute inset-0" />
        {listings.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted pointer-events-none">
            No listings match these filters.
          </div>
        ) : (
          <div className="absolute bottom-0 inset-x-0 p-3 flex gap-3 overflow-x-auto">
            {listings.map((l) => (
              <Link
                key={l.id}
                id={`card-${l.id}`}
                href={`/listings/${l.id}`}
                onMouseEnter={() => setActive(l.id)}
                onMouseLeave={() => setActive((a) => (a === l.id ? null : a))}
                className={`shrink-0 w-60 bg-surface rounded-lg border overflow-hidden shadow-card transition-colors ${active === l.id ? "border-accent" : "border-line"}`}
              >
                <div className="h-24 bg-surface-2">
                  {l.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">No photo</div>
                  )}
                </div>
                <div className="p-2.5">
                  <div className="text-sm font-semibold text-accent tabular-nums">{l.priceLabel}</div>
                  <div className="text-xs text-ink truncate">{l.title}</div>
                  <div className="text-[11px] text-ink-muted truncate">
                    {[l.bhk ? `${l.bhk} BHK` : null, l.locality, l.city].filter(Boolean).join(" · ")}
                  </div>
                  {l.booking && (
                    <div className="text-[10px] text-high mt-1">{l.booking.byMyFirm ? "Booked by you" : "Reserved"}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .ms-pin {
          background: var(--accent-primary); color: #fff; font-size: 12px; font-weight: 600;
          padding: 3px 8px; border-radius: 999px; border: 2px solid #fff; cursor: pointer; white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,.25); transition: transform .12s ease, background .12s ease;
        }
        .ms-pin--active { background: var(--gold); transform: scale(1.12); z-index: 10; }
      `}</style>
    </div>
  );
}
