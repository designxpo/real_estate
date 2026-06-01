// Builds a broker-friendly, multi-line WhatsApp share message for a property.
import { formatINR } from "@/lib/utils";
import type { Furnishing, ListingType, PriceUnit, PropertyType } from "@prisma/client";

export interface ShareableProperty {
  title: string;
  bhk?: number | null;
  propertyType: PropertyType;
  listingType: ListingType;
  priceAmount: string | number;
  priceUnit: PriceUnit;
  negotiable?: boolean;
  locality?: string | null;
  city?: string | null;
  carpetSqft?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  furnishing?: Furnishing | null;
  facing?: string | null;
  ageYears?: number | null;
  amenities?: string[];
  publicSlug?: string | null;
  brokerName?: string | null;
  brokerPhone?: string | null;
}

export function buildShareText(p: ShareableProperty, baseUrl: string): string {
  const lines: string[] = [];

  const head = [p.bhk ? `${p.bhk} BHK` : null, p.propertyType, `for ${p.listingType}`]
    .filter(Boolean)
    .join(" ");
  lines.push(`*${p.title}*`);
  if (head) lines.push(head);

  const price = `${formatINR(p.priceAmount, p.priceUnit)}${p.negotiable ? " (negotiable)" : ""}`;
  lines.push(`💰 ${price}`);

  const loc = [p.locality, p.city].filter(Boolean).join(", ");
  if (loc) lines.push(`📍 ${loc}`);

  const facts: string[] = [];
  if (p.carpetSqft) facts.push(`${p.carpetSqft} sqft carpet`);
  if (p.floor != null) facts.push(`Floor ${p.floor}${p.totalFloors ? `/${p.totalFloors}` : ""}`);
  if (p.furnishing) facts.push(`${p.furnishing} furnished`);
  if (p.facing) facts.push(`${p.facing} facing`);
  if (p.ageYears != null) facts.push(`${p.ageYears} yr old`);
  if (facts.length) lines.push(`🏠 ${facts.join(" · ")}`);

  if (p.amenities && p.amenities.length) {
    lines.push(`✨ ${p.amenities.slice(0, 6).join(", ")}`);
  }

  if (p.publicSlug) {
    lines.push("");
    lines.push(`🔗 ${baseUrl}/p/${p.publicSlug}`);
  }

  if (p.brokerName || p.brokerPhone) {
    lines.push("");
    lines.push(`📞 ${[p.brokerName, p.brokerPhone].filter(Boolean).join(" — ")}`);
  }

  return lines.join("\n");
}
