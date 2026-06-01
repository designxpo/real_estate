// Lead-stage presentation helpers. Colours follow the Nebula Dark semantic
// palette: gray = waiting · blue = active · amber = action needed · green = done
// · red = lost. STAGE_COLORS values are Tailwind class strings appended to a
// rounded-full pill.
import type { LeadStage } from "@prisma/client";

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  site_visit_scheduled: "Visit Scheduled",
  visited: "Visited",
  negotiating: "Negotiating",
  token: "Token",
  agreement: "Agreement",
  registered: "Registered",
  lost: "Lost",
};

export const STAGE_COLORS: Record<LeadStage, string> = {
  new: "bg-blue-500/15 text-blue-300",
  contacted: "bg-blue-500/15 text-blue-300",
  site_visit_scheduled: "bg-amber-500/15 text-amber-300",
  visited: "bg-cyan-500/15 text-cyan-300",
  negotiating: "bg-amber-500/15 text-amber-300",
  token: "bg-emerald-500/15 text-emerald-300",
  agreement: "bg-emerald-500/15 text-emerald-300",
  registered: "bg-green-500/20 text-green-300",
  lost: "bg-red-500/15 text-red-300",
};

// Stage ordering for the kanban / funnel (lost handled separately).
export const STAGE_ORDER: LeadStage[] = [
  "new",
  "contacted",
  "site_visit_scheduled",
  "visited",
  "negotiating",
  "token",
  "agreement",
  "registered",
];
