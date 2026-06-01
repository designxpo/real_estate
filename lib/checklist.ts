// Server-side derivation of the Getting Started checklist state.
// Each item is "done" based on real DB facts — there's no separate flag table
// to drift out of sync.

import { prisma } from "@/lib/db";

export type ChecklistItem = {
  id: string;
  label: string;
  href: string;
  done: boolean;
  // Short why-this-matters line for the tooltip / hover state.
  why: string;
};

export async function getChecklist(firmId: string): Promise<ChecklistItem[]> {
  const [propCount, contactCount, leadCount, visitCount, registeredDealCount, invoiceCount] =
    await Promise.all([
      prisma.property.count({ where: { firmId, isDemo: false } }),
      prisma.contact.count({ where: { firmId, isDemo: false } }),
      prisma.lead.count({ where: { firmId, isDemo: false } }),
      prisma.siteVisit.count({ where: { lead: { firmId, isDemo: false } } }),
      prisma.deal.count({ where: { firmId, isDemo: false, stage: { in: ["registration", "completed"] } } }),
      prisma.invoice.count({ where: { firmId } }),
    ]);

  return [
    {
      id: "property",
      label: "Add your first property",
      href: "/properties/new",
      done: propCount > 0,
      why: "Properties are what you list to portals and what leads attach to.",
    },
    {
      id: "contact",
      label: "Add a contact (buyer or seller)",
      href: "/contacts/new",
      done: contactCount > 0,
      why: "Every lead and deal is anchored to a contact — that's how you keep one phone number with one history.",
    },
    {
      id: "lead",
      label: "Capture your first lead",
      href: "/leads/new",
      done: leadCount > 0,
      why: "Leads are buyers/tenants asking about properties. Use the kanban to track who's hot.",
    },
    {
      id: "visit",
      label: "Schedule a site visit",
      href: "/leads",
      done: visitCount > 0,
      why: "Visits auto-advance the lead stage and remind you to follow up afterwards.",
    },
    {
      id: "deal",
      label: "Close a deal (mark as registered)",
      href: "/deals",
      done: registeredDealCount > 0,
      why: "When a deal hits Registration, all commission splits flip to payable automatically.",
    },
    {
      id: "invoice",
      label: "Generate your first GST invoice",
      href: "/deals",
      done: invoiceCount > 0,
      why: "Invoices use HSN/SAC 9972, sequential FY numbering, and auto-pick CGST+SGST vs IGST by state.",
    },
  ];
}

export function checklistProgress(items: ChecklistItem[]): { done: number; total: number; pct: number } {
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  return { done, total, pct: total === 0 ? 0 : (done / total) * 100 };
}
