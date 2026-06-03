// Subscription plan catalog. Each plan caps how many marketplace listings a firm
// can hold BOOKED at once (the booking model's scarcity lever). Edit prices/caps
// here — they're the single source of truth for billing + cap enforcement.
export interface Plan {
  id: string;
  name: string;
  maxActiveBookings: number;
  priceMonthly: number; // INR rupees, 0 = free
  tagline: string;
}

export const PLANS: Plan[] = [
  { id: "free", name: "Free", maxActiveBookings: 1, priceMonthly: 0, tagline: "Try the marketplace" },
  { id: "starter", name: "Starter", maxActiveBookings: 3, priceMonthly: 999, tagline: "For solo brokers" },
  { id: "pro", name: "Pro", maxActiveBookings: 10, priceMonthly: 2999, tagline: "For growing teams" },
  { id: "elite", name: "Elite", maxActiveBookings: 50, priceMonthly: 7999, tagline: "For large brokerages" },
];

export const FREE_PLAN = PLANS[0];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? FREE_PLAN;
}

export function priceLabel(p: Plan): string {
  return p.priceMonthly === 0 ? "Free" : `₹${p.priceMonthly.toLocaleString("en-IN")}/mo`;
}
