// URL slug helpers for public property pages (/p/[slug]).
import { randomBytes } from "crypto";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

// Short, URL-safe, collision-resistant suffix.
export function shortId(len = 6): string {
  return randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
}

// `slugify(title) + "-" + shortId()` — unique per property.
export function makePropertySlug(title: string): string {
  const base = slugify(title) || "property";
  return `${base}-${shortId()}`;
}
