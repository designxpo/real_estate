// Subscription plan catalog. Each plan caps how many marketplace listings a firm
// can hold BOOKED at once (the booking model's scarcity lever).
//
// Plans are DB-backed (model Plan) so the platform owner can edit pricing/caps
// live from the /platform console. DEFAULT_PLANS below is the seed + offline
// fallback — it is upserted into the `plans` table on first read (see
// ensurePlansSeeded). Once seeded, the DB is the source of truth.
import { prisma } from "@/lib/db";

export interface Plan {
  id: string;
  name: string;
  maxActiveBookings: number;
  priceMonthly: number; // INR rupees, 0 = free
  tagline: string;
  features?: string[];
}

export const FREE_PLAN_ID = "free";

// Seed + fallback. Order here defines sortOrder when seeding.
export const DEFAULT_PLANS: Plan[] = [
  { id: "free", name: "Free", maxActiveBookings: 1, priceMonthly: 0, tagline: "Try the marketplace", features: ["1 active booking", "Marketplace access"] },
  { id: "starter", name: "Starter", maxActiveBookings: 3, priceMonthly: 999, tagline: "For solo brokers", features: ["3 active bookings", "In-app chat"] },
  { id: "pro", name: "Pro", maxActiveBookings: 10, priceMonthly: 2999, tagline: "For growing teams", features: ["10 active bookings", "Priority support"] },
  { id: "elite", name: "Elite", maxActiveBookings: 50, priceMonthly: 7999, tagline: "For large brokerages", features: ["50 active bookings", "Dedicated success manager"] },
];

export const FREE_PLAN: Plan = DEFAULT_PLANS[0];

// Map a DB row to the Plan shape used throughout the app.
type PlanRow = {
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  maxActiveBookings: number;
  features: string[];
};
function fromRow(r: PlanRow): Plan {
  return {
    id: r.id,
    name: r.name,
    tagline: r.tagline,
    priceMonthly: r.priceMonthly,
    maxActiveBookings: r.maxActiveBookings,
    features: r.features,
  };
}

// Idempotent: seed DEFAULT_PLANS the first time the table is empty.
export async function ensurePlansSeeded(): Promise<void> {
  const count = await prisma.plan.count();
  if (count > 0) return;
  await prisma.$transaction(
    DEFAULT_PLANS.map((p, i) =>
      prisma.plan.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          name: p.name,
          tagline: p.tagline,
          priceMonthly: p.priceMonthly,
          maxActiveBookings: p.maxActiveBookings,
          features: p.features ?? [],
          sortOrder: i,
        },
      })
    )
  );
}

// All active plans, ordered for display. Falls back to DEFAULT_PLANS if the DB
// is unreachable (keeps the marketing/billing pages rendering).
export async function getPlans(includeInactive = false): Promise<Plan[]> {
  try {
    await ensurePlansSeeded();
    const rows = await prisma.plan.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ sortOrder: "asc" }, { priceMonthly: "asc" }],
    });
    if (rows.length === 0) return DEFAULT_PLANS;
    return rows.map(fromRow);
  } catch {
    return DEFAULT_PLANS;
  }
}

// Resolve a single plan by id, falling back to Free (then DEFAULT_PLANS).
export async function getPlan(id: string | null | undefined): Promise<Plan> {
  try {
    await ensurePlansSeeded();
    if (id) {
      const row = await prisma.plan.findUnique({ where: { id } });
      if (row) return fromRow(row);
    }
    const free = await prisma.plan.findUnique({ where: { id: FREE_PLAN_ID } });
    if (free) return fromRow(free);
  } catch {
    /* fall through to constant */
  }
  return DEFAULT_PLANS.find((p) => p.id === id) ?? FREE_PLAN;
}

export function priceLabel(p: Plan): string {
  return p.priceMonthly === 0 ? "Free" : `₹${p.priceMonthly.toLocaleString("en-IN")}/mo`;
}
