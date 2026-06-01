// Property activation state machine.
//
//   draft ──(broker: request-activation)──> pending
//   pending ──(landlord: confirm)──────────> active
//   active  ──(landlord: book)─────────────> booked
//   booked  ──(landlord: re-list)──────────> active
//   active/booked/pending ──(broker)───────> inactive | withdrawn
//
// `legacy` statuses (under_offer, closed, withdrawn) remain valid for the
// pre-existing deal flow and are not part of the landlord toggle surface.

import type { PropertyStatus } from "@prisma/client";

// Transitions a LANDLORD is allowed to perform (via magic link).
const LANDLORD_TRANSITIONS: Partial<Record<PropertyStatus, PropertyStatus[]>> = {
  pending: ["active"], // confirm activation
  active: ["booked"], // secured a tenant
  booked: ["active"], // tenant fell through / re-listing
};

// Transitions a BROKER (owner/principal/sub_broker) is allowed to perform.
const BROKER_TRANSITIONS: Partial<Record<PropertyStatus, PropertyStatus[]>> = {
  draft: ["pending", "active", "inactive"],
  pending: ["active", "inactive", "draft"],
  active: ["booked", "inactive", "under_offer", "withdrawn"],
  booked: ["active", "inactive"],
  inactive: ["draft", "active"],
  under_offer: ["active", "closed", "booked"],
  withdrawn: ["draft", "active"],
  closed: [],
};

export type Actor = "landlord" | "broker";

export function canTransition(
  actor: Actor,
  from: PropertyStatus,
  to: PropertyStatus
): boolean {
  if (from === to) return false;
  const table = actor === "landlord" ? LANDLORD_TRANSITIONS : BROKER_TRANSITIONS;
  return (table[from] ?? []).includes(to);
}

export function allowedNextStatuses(actor: Actor, from: PropertyStatus): PropertyStatus[] {
  const table = actor === "landlord" ? LANDLORD_TRANSITIONS : BROKER_TRANSITIONS;
  return table[from] ?? [];
}

// When a property becomes booked, its public listing should be archived.
export function publicEnabledFor(status: PropertyStatus): boolean {
  return status === "active";
}

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: "Draft",
  pending: "Pending Authorization",
  active: "Active",
  booked: "Booked",
  inactive: "Inactive",
  under_offer: "Under Offer",
  closed: "Closed",
  withdrawn: "Withdrawn",
};
