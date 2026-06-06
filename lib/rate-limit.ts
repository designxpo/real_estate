// Lightweight in-memory sliding-window rate limiter. Suitable for a single
// instance / dev; for multi-instance production swap the store for Redis/Upstash
// (same interface). Keeps abuse (SMS bombing, lead spam) in check before we ever
// hit the DB or an SMS provider.
//
// Design note on IPs: never trust a raw `X-Forwarded-For` for security decisions
// (it's client-spoofable). We therefore key SMS/lead limits primarily on the
// *resource* (phone number, listing slug) — which an attacker cannot rotate to
// keep bombing the same victim/number — and use IP only as a best-effort
// secondary signal. See clientIp() below.

type Stamps = number[];
const store = new Map<string, Stamps>();

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

// Returns ok=false once `limit` hits have occurred within `windowMs` for `key`.
// Counts this call as a hit only when allowed (so a blocked caller doesn't keep
// extending their own window).
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const fresh = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (fresh.length >= limit) {
    const retryAfterSec = Math.ceil((windowMs - (now - fresh[0])) / 1000);
    store.set(key, fresh);
    return { ok: false, remaining: 0, retryAfterSec };
  }
  fresh.push(now);
  store.set(key, fresh);
  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (v.every((t) => now - t >= windowMs)) store.delete(k);
    }
  }
  return { ok: true, remaining: limit - fresh.length, retryAfterSec: 0 };
}

// Best-effort client IP. Behind Vercel/Cloudflare the platform sets a trustworthy
// X-Forwarded-For; we take the FIRST entry (the original client) and fall back to
// other proxy headers. NOT authoritative — use only as a secondary limit key.
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || "anon";
}

// Standard 429 body + Retry-After header.
export function tooMany(retryAfterSec: number) {
  return new Response(JSON.stringify({ error: "Too many requests. Please wait and try again." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(Math.max(1, retryAfterSec)) },
  });
}
