// Returns the highest-leverage "what should I do next?" hint for a given
// lead or deal stage. Powers the next-action badges on cards.

import type { LeadStage, DealStage } from "@prisma/client";

export type NextAction = {
  label: string;
  /** Visual tone for the badge */
  tone: "blue" | "amber" | "green" | "purple" | "neutral";
  /** Optional explicit call-to-action used in the card footer */
  cta?: string;
};

export const LEAD_NEXT: Record<LeadStage, NextAction | null> = {
  new: { label: "Call now", tone: "amber", cta: "Mark contacted" },
  contacted: { label: "Schedule visit", tone: "blue", cta: "→ Visit scheduled" },
  site_visit_scheduled: { label: "Confirm visit", tone: "blue", cta: "→ Visited" },
  visited: { label: "Send offer", tone: "purple", cta: "→ Negotiating" },
  negotiating: { label: "Convert to deal", tone: "amber", cta: "Open deal" },
  token: { label: "Move to agreement", tone: "blue", cta: "→ Agreement" },
  agreement: { label: "Mark registered", tone: "green", cta: "→ Registered" },
  registered: null,
  lost: null,
};

export const DEAL_NEXT: Record<DealStage, NextAction | null> = {
  token: { label: "Set agreement date", tone: "blue", cta: "→ Agreement" },
  agreement: { label: "Set registration date", tone: "blue", cta: "→ Registration" },
  registration: { label: "Pay commissions", tone: "amber", cta: "Open splits" },
  completed: null,
  cancelled: null,
};
