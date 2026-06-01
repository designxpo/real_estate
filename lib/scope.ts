// Firm-scoped visibility helpers — the app-layer equivalent of row-level
// security. Every list/detail query mixes one of these `where` fragments in so
// a user only ever sees their firm's data, and sub-brokers only their own slice.
//
// Management roles (owner / principal / accounts) see everything in the firm.
// Sub-brokers see only the records they own/are assigned to.
import type { Role } from "@prisma/client";

type ScopedUser = { id: string; firmId: string; role: Role };

export function canSeeAllInFirm(role: Role): boolean {
  return role === "owner" || role === "principal" || role === "accounts";
}

// Properties: scoped by the listing broker.
export function propertyVisibility(user: ScopedUser) {
  if (canSeeAllInFirm(user.role)) return { firmId: user.firmId };
  return { firmId: user.firmId, listedByUserId: user.id };
}

// Leads: scoped by assignee.
export function leadVisibility(user: ScopedUser) {
  if (canSeeAllInFirm(user.role)) return { firmId: user.firmId };
  return { firmId: user.firmId, assignedToUserId: user.id };
}

// Deals: scoped by primary broker.
export function dealVisibility(user: ScopedUser) {
  if (canSeeAllInFirm(user.role)) return { firmId: user.firmId };
  return { firmId: user.firmId, primaryBrokerUserId: user.id };
}

// Contacts: scoped by assignee.
export function contactVisibility(user: ScopedUser) {
  if (canSeeAllInFirm(user.role)) return { firmId: user.firmId };
  return { firmId: user.firmId, assignedToUserId: user.id };
}
