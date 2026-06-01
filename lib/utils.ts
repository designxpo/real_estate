import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(value: number | string, unit: "lakh" | "crore" | "per_month" | "per_sqft") {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  switch (unit) {
    case "crore":
      return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
    case "lakh":
      return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
    case "per_month":
      return `₹${n.toLocaleString("en-IN")}/mo`;
    case "per_sqft":
      return `₹${n.toLocaleString("en-IN")}/sqft`;
  }
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  // Accept "9XXXXXXXXX" or "919XXXXXXXXX" or "+919XXXXXXXXX"; store as "+91XXXXXXXXXX"
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("091")) return `+${digits.slice(1)}`;
  return `+${digits}`;
}
