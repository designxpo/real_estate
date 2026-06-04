// Address → lat/lng via OpenStreetMap Nominatim (free, no key). Best-effort:
// never throws, returns null on any failure. Respects Nominatim policy with a
// User-Agent and low volume (called on activation + a throttled backfill).
import { prisma } from "@/lib/db";

interface GeoParts {
  addressLine?: string | null;
  locality?: string | null;
  city: string;
  state?: string | null;
  pincode?: string | null;
}

export async function geocode(parts: GeoParts): Promise<{ lat: number; lng: number } | null> {
  const q = [parts.addressLine, parts.locality, parts.city, parts.state, parts.pincode, "India"]
    .filter(Boolean)
    .join(", ");
  if (!q.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "User-Agent": "BrokerPlatform/1.0 (marketplace listings geocoder)" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

// Geocode a listing only if it has no coordinates yet, then persist. Best-effort.
export async function geocodeListingIfNeeded(listingId: string): Promise<void> {
  try {
    const l = await prisma.marketplaceListing.findUnique({ where: { id: listingId } });
    if (!l || (l.lat != null && l.lng != null)) return;
    const geo = await geocode({ addressLine: l.addressLine, locality: l.locality, city: l.city, state: l.state, pincode: l.pincode });
    if (geo) await prisma.marketplaceListing.update({ where: { id: listingId }, data: { lat: geo.lat, lng: geo.lng } });
  } catch {
    /* never block the caller */
  }
}
