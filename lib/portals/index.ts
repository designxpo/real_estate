// Portal syndication registry.
//
// Each portal has an adapter that knows (a) what feed file format it pulls and
// (b) how to validate that a property is listable on that portal. The broker
// UI uses `ALL_PORTALS` to render feed URLs + per-portal validation, and the
// feed endpoint uses the adapter to render the actual XML/CSV.
//
// NOTE: rebuilt to the contract used by the surviving UI (fileExtension +
// validate). Feed-rendering / API-push live in their own modules.
import type { Property, PortalId } from "@prisma/client";

export interface ValidationResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
}

export interface PortalAdapter {
  id: PortalId;
  displayName: string;
  fileExtension(): "xml" | "csv";
  validate(property: Property): ValidationResult;
}

// Shared baseline checks every portal needs.
function baseValidate(p: Property): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!p.title || p.title.length < 3) errors.push("Title too short");
  if (!p.city) errors.push("City is required");
  if (Number(p.priceAmount) <= 0) errors.push("Price must be set");
  if (!p.locality) warnings.push("Locality improves portal ranking");
  if (!p.carpetSqft && !p.builtupSqft) warnings.push("Area (sqft) recommended");
  return { ok: errors.length === 0, warnings, errors };
}

class XmlAdapter implements PortalAdapter {
  constructor(public id: PortalId, public displayName: string) {}
  fileExtension(): "xml" | "csv" {
    return "xml";
  }
  validate(p: Property): ValidationResult {
    return baseValidate(p);
  }
}

// 99acres rejects rent listings without a furnishing value.
class NinetyNineAcresAdapter extends XmlAdapter {
  validate(p: Property): ValidationResult {
    const base = baseValidate(p);
    if (p.listingType === "rent" && !p.furnishing) {
      base.errors.push("99acres requires furnishing for rentals");
      base.ok = false;
    }
    return base;
  }
}

class CsvAdapter implements PortalAdapter {
  constructor(public id: PortalId, public displayName: string) {}
  fileExtension(): "xml" | "csv" {
    return "csv";
  }
  validate(p: Property): ValidationResult {
    return baseValidate(p);
  }
}

const ADAPTERS: Record<string, PortalAdapter> = {
  ninetynine_acres: new NinetyNineAcresAdapter("ninetynine_acres", "99acres"),
  magicbricks: new XmlAdapter("magicbricks", "MagicBricks"),
  housing: new XmlAdapter("housing", "Housing.com"),
  custom_csv: new CsvAdapter("custom_csv", "Custom CSV"),
};

// Portals exposed in the UI, in display order.
export const ALL_PORTALS: Array<{ id: PortalId; displayName: string }> = [
  { id: "ninetynine_acres", displayName: "99acres" },
  { id: "magicbricks", displayName: "MagicBricks" },
  { id: "housing", displayName: "Housing.com" },
  { id: "custom_csv", displayName: "Custom CSV" },
];

export function getAdapter(portal: PortalId): PortalAdapter | undefined {
  return ADAPTERS[portal];
}
