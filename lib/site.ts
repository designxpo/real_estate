// Canonical public site origin (no trailing slash). Set NEXT_PUBLIC_SITE_URL in
// production (e.g. https://www.yourbrand.com); falls back to localhost in dev.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

// URL-safe slug for a city/locality name. "New Delhi" -> "new-delhi".
export function citySlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
