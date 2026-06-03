// Shared activity log for marketplace listings. Both the owner (app) and the
// managing broker (portal) write here and both can read the same timeline.
// Never throws into the caller's path — a logging failure must not break the
// mutation it records.
import { prisma } from "@/lib/db";
import type { Prisma, ListingActivityLog } from "@prisma/client";

export type ActorType = "owner" | "broker";

export interface LogListingActivityInput {
  listingId: string;
  actorType: ActorType;
  actorName: string;
  action: string;
  detail?: string | null;
  payload?: Record<string, unknown>;
}

export async function logListingActivity(input: LogListingActivityInput): Promise<void> {
  try {
    await prisma.listingActivityLog.create({
      data: {
        listingId: input.listingId,
        actorType: input.actorType,
        actorName: input.actorName,
        action: input.action,
        detail: input.detail ?? null,
        payload: input.payload as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[listing-activity] failed to log", input.action, e);
  }
}

export function serializeActivity(a: ListingActivityLog) {
  return {
    id: a.id,
    actorType: a.actorType,
    actorName: a.actorName,
    action: a.action,
    detail: a.detail,
    createdAt: a.createdAt,
  };
}

// Fields we summarize in a human-readable "before → after" detail line.
const LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  priceAmount: "Price",
  priceUnit: "Price unit",
  negotiable: "Negotiable",
  maintenanceAmount: "Maintenance",
  depositMonths: "Deposit",
  listingType: "Listing type",
  propertyType: "Property type",
  bhk: "BHK",
  carpetSqft: "Carpet area",
  builtupSqft: "Built-up area",
  furnishing: "Furnishing",
  addressLine: "Address",
  locality: "Locality",
  city: "City",
  state: "State",
  pincode: "Pincode",
  amenities: "Amenities",
  availableFrom: "Available from",
  reraId: "RERA ID",
};

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

// Build a "Price 45 → 48 · Locality A → B" summary of the changed fields.
// `next` holds only the keys that were actually provided in the update.
export function describeChanges(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): string | null {
  const parts: string[] = [];
  for (const key of Object.keys(next)) {
    const label = LABELS[key];
    if (!label) continue;
    const before = prev[key];
    const after = next[key];
    const b = before instanceof Object && !(before instanceof Date) && !Array.isArray(before)
      ? String(before)
      : before;
    const a = after instanceof Object && !(after instanceof Date) && !Array.isArray(after)
      ? String(after)
      : after;
    if (show(b) === show(a)) continue;
    parts.push(`${label} ${show(before)} → ${show(after)}`);
  }
  return parts.length ? parts.join(" · ") : null;
}
