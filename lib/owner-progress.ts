// Owner-facing "deal progress" — an Amazon-delivery-style stepper derived from
// real broker activity on a marketplace listing:
//   Listed → Inquiry → Site Visit → Negotiating → Finalizing → Closed
//
// Sources of truth (best signal wins → furthest step reached):
//   • Listed      : listing is live
//   • Inquiry     : ≥1 ListingUnlock (a broker took the owner's contact)
//   • Visit→Final : the stage of any linked broker Lead (Lead.marketplaceListingId)
//   • Closed      : listing booked, or a linked lead registered
import { prisma } from "@/lib/db";
import { marketplaceBus } from "@/lib/realtime";
import type { LeadStage } from "@prisma/client";

export const PROGRESS_STEPS = [
  "listed",
  "inquiry",
  "site_visit",
  "negotiating",
  "finalizing",
  "closed",
] as const;
export type ProgressStep = (typeof PROGRESS_STEPS)[number];

const STEP_LABELS: Record<ProgressStep, string> = {
  listed: "Listed",
  inquiry: "Inquiry",
  site_visit: "Site Visit",
  negotiating: "Negotiating",
  finalizing: "Finalizing",
  closed: "Closed",
};

// Map a broker LeadStage to a progress step index. `lost` contributes nothing.
function leadStageToStep(stage: LeadStage): number {
  switch (stage) {
    case "new":
    case "contacted":
      return 1; // inquiry
    case "site_visit_scheduled":
    case "visited":
      return 2; // site visit
    case "negotiating":
    case "token":
      return 3; // negotiating
    case "agreement":
      return 4; // finalizing
    case "registered":
      return 5; // closed
    default:
      return 0;
  }
}

export interface OwnerProgress {
  step: number; // furthest step reached, 0..5
  stepKey: ProgressStep;
  label: string;
  steps: { key: ProgressStep; label: string }[];
  interestedBrokers: number;
  updatedAt: string;
}

export function buildProgress(input: {
  moderation: string;
  status: string;
  unlockCount: number;
  leadStages: LeadStage[];
}): OwnerProgress {
  let step = 0; // listed
  if (input.unlockCount > 0) step = Math.max(step, 1);
  for (const s of input.leadStages) step = Math.max(step, leadStageToStep(s));
  if (input.status === "booked") step = 5;
  return {
    step,
    stepKey: PROGRESS_STEPS[step],
    label: STEP_LABELS[PROGRESS_STEPS[step]],
    steps: PROGRESS_STEPS.map((k) => ({ key: k, label: STEP_LABELS[k] })),
    interestedBrokers: input.unlockCount,
    updatedAt: new Date().toISOString(),
  };
}

export async function computeProgress(listingId: string): Promise<{ ownerId: string; title: string; progress: OwnerProgress } | null> {
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    select: {
      ownerId: true,
      title: true,
      moderation: true,
      status: true,
      _count: { select: { unlocks: true } },
      leads: { where: { stage: { not: "lost" } }, select: { stage: true } },
    },
  });
  if (!listing) return null;
  return {
    ownerId: listing.ownerId,
    title: listing.title,
    progress: buildProgress({
      moderation: listing.moderation,
      status: listing.status,
      unlockCount: listing._count.unlocks,
      leadStages: listing.leads.map((l) => l.stage),
    }),
  };
}

// Friendly push copy per step (step 0 = "listed" gets no push).
const STEP_PUSH: Record<number, string> = {
  1: "A broker is interested in your property 👀",
  2: "A site visit is in motion 🏠",
  3: "Your deal is in negotiation 🤝",
  4: "Your deal is being finalized 📝",
  5: "Your property deal closed! 🎉",
};

// Recompute + push a real-time SSE event AND an FCM notification to the owner.
export async function notifyProgress(listingId: string): Promise<void> {
  const result = await computeProgress(listingId);
  if (!result) return;
  marketplaceBus.emit("owner_progress", {
    ownerId: result.ownerId,
    listingId,
    progress: result.progress,
  });

  const body = STEP_PUSH[result.progress.step];
  if (body) {
    // Lazy import keeps firebase-admin out of the hot path when unconfigured.
    const { sendToOwner } = await import("@/lib/fcm");
    await sendToOwner(result.ownerId, {
      title: result.title,
      body,
      data: { listingId, step: String(result.progress.step), type: "progress" },
    });
  }
}
