// Sample data generator for new firms — populates a realistic demo dataset
// so a newbie can experiment before adding real properties / leads.
// Everything created here is tagged isDemo=true and can be wiped via
// `clearDemoData(firmId)` from Settings.

import { prisma } from "@/lib/db";
import { makePropertySlug } from "@/lib/slug";

type SeedResult = {
  contacts: number;
  properties: number;
  leads: number;
  deals: number;
};

export async function seedDemoData(firmId: string, ownerUserId: string): Promise<SeedResult> {
  // Ensure we don't double-seed: if any demo data already exists, skip.
  const existing = await prisma.property.count({ where: { firmId, isDemo: true } });
  if (existing > 0) return { contacts: 0, properties: 0, leads: 0, deals: 0 };

  const contacts = await Promise.all(
    [
      { name: "Vikram Mehta", phone: "+919900011111", type: "buyer" as const, source: "whatsapp" as const },
      { name: "Priya Nair", phone: "+919900022222", type: "seller" as const, source: "referral" as const },
      { name: "Arjun Reddy", phone: "+919900033333", type: "tenant" as const, source: "walkin" as const },
      { name: "Sneha Iyer", phone: "+919900044444", type: "landlord" as const, source: "ninetynine_acres" as const },
      { name: "Kabir Khan", phone: "+919900055555", type: "buyer" as const, source: "magicbricks" as const },
    ].map((c) =>
      prisma.contact.create({
        data: {
          firmId,
          assignedToUserId: ownerUserId,
          isDemo: true,
          tags: ["DEMO"],
          ...c,
        },
      })
    )
  );

  const p1 = await prisma.property.create({
    data: {
      firmId,
      listedByUserId: ownerUserId,
      ownerContactId: contacts[1].id,
      title: "[DEMO] 3 BHK Apartment in Koramangala",
      description: "Sample listing for learning. 3BHK with full amenities, 14th floor, sun-drenched.",
      listingType: "sale",
      propertyType: "apartment",
      bhk: 3,
      carpetSqft: 1650,
      priceAmount: 1.85,
      priceUnit: "crore",
      city: "Bengaluru",
      locality: "Koramangala 5th Block",
      state: "Karnataka",
      pincode: "560095",
      amenities: ["Pool", "Gym", "Clubhouse", "Power Backup"],
      furnishing: "semi",
      facing: "East",
      floor: 14,
      totalFloors: 22,
      status: "active",
      isDemo: true,
      publicSlug: makePropertySlug("Demo Koramangala 3BHK"),
    },
  });

  const p2 = await prisma.property.create({
    data: {
      firmId,
      listedByUserId: ownerUserId,
      ownerContactId: contacts[3].id,
      title: "[DEMO] 2 BHK on rent, Indiranagar",
      listingType: "rent",
      propertyType: "apartment",
      bhk: 2,
      carpetSqft: 1100,
      priceAmount: 55000,
      priceUnit: "per_month",
      maintenanceAmount: 4000,
      depositMonths: 10,
      city: "Bengaluru",
      locality: "Indiranagar",
      furnishing: "fully",
      status: "active",
      isDemo: true,
      publicSlug: makePropertySlug("Demo Indiranagar 2BHK"),
    },
  });

  const p3 = await prisma.property.create({
    data: {
      firmId,
      listedByUserId: ownerUserId,
      title: "[DEMO] Commercial plot, Whitefield",
      listingType: "sale",
      propertyType: "plot",
      priceAmount: 4.5,
      priceUnit: "crore",
      city: "Bengaluru",
      locality: "Whitefield",
      status: "draft",
      isDemo: true,
      publicSlug: makePropertySlug("Demo Whitefield Plot"),
    },
  });

  // Leads across the funnel so the kanban looks alive
  await prisma.lead.create({
    data: {
      firmId,
      contactId: contacts[0].id,
      propertyId: p1.id,
      source: "whatsapp",
      intent: "buy",
      assignedToUserId: ownerUserId,
      stage: "new",
      requirementsText: "3BHK, semi-furnished, ≤ 2Cr, Koramangala/Indiranagar.",
      budgetMax: 20000000,
      nextFollowupAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isDemo: true,
    },
  });
  await prisma.lead.create({
    data: {
      firmId,
      contactId: contacts[2].id,
      propertyId: p2.id,
      source: "walkin",
      intent: "rent",
      assignedToUserId: ownerUserId,
      stage: "site_visit_scheduled",
      requirementsText: "2BHK fully-furnished, Indiranagar, ₹60k/mo budget.",
      nextFollowupAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // overdue on purpose
      isDemo: true,
    },
  });
  await prisma.lead.create({
    data: {
      firmId,
      contactId: contacts[4].id,
      propertyId: p1.id,
      source: "magicbricks",
      intent: "invest",
      assignedToUserId: ownerUserId,
      stage: "negotiating",
      budgetMin: 15000000,
      budgetMax: 20000000,
      requirementsText: "NRI buyer — wants to close fast.",
      isDemo: true,
    },
  });

  // An in-progress deal at token stage so the user can see commission splits
  const deal = await prisma.deal.create({
    data: {
      firmId,
      propertyId: p1.id,
      buyerContactId: contacts[4].id,
      sellerContactId: contacts[1].id,
      dealType: "sale",
      agreedPrice: 17500000,
      brokeragePctBuyerSide: 1,
      brokeragePctSellerSide: 1,
      brokerageAmountBuyer: 175000,
      brokerageAmountSeller: 175000,
      totalBrokerage: 350000,
      stage: "token",
      tokenAmount: 250000,
      tokenDate: new Date(),
      primaryBrokerUserId: ownerUserId,
      notes: "Sample deal to demonstrate the commission split + invoice flow.",
      isDemo: true,
    },
  });

  await prisma.commissionSplit.createMany({
    data: [
      {
        dealId: deal.id,
        userId: ownerUserId,
        role: "sourcing",
        pctOfTotal: 50,
        amount: 175000,
        tdsPct: 5,
        tdsAmount: 8750,
        netAmount: 166250,
        status: "pending",
      },
      {
        dealId: deal.id,
        externalName: "Channel Partner Co.",
        role: "reference",
        pctOfTotal: 20,
        amount: 70000,
        tdsPct: 5,
        tdsAmount: 3500,
        netAmount: 66500,
        status: "pending",
      },
    ],
  });

  return {
    contacts: contacts.length,
    properties: 3,
    leads: 3,
    deals: 1,
  };
}

// Removes everything tagged isDemo=true for this firm.
export async function clearDemoData(firmId: string): Promise<SeedResult> {
  const [splits, deals, leads, properties, contacts] = await prisma.$transaction([
    prisma.commissionSplit.deleteMany({ where: { deal: { firmId, isDemo: true } } }),
    prisma.deal.deleteMany({ where: { firmId, isDemo: true } }),
    prisma.lead.deleteMany({ where: { firmId, isDemo: true } }),
    prisma.property.deleteMany({ where: { firmId, isDemo: true } }),
    prisma.contact.deleteMany({ where: { firmId, isDemo: true } }),
  ]);
  return {
    contacts: contacts.count,
    properties: properties.count,
    leads: leads.count,
    deals: deals.count,
  };
}
