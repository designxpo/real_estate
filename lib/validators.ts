import { z } from "zod";

export const phoneSchema = z
  .string()
  .min(10)
  .max(15)
  .regex(/^\+?[0-9\s-]+$/, "Invalid phone number");

export const otpStartSchema = z.object({
  phone: phoneSchema,
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  name: z.string().min(1).max(120).optional(),
  firmName: z.string().min(1).max(200).optional(),
});

export const contactCreateSchema = z.object({
  name: z.string().min(1).max(120),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal("")),
  type: z.enum(["buyer", "seller", "tenant", "landlord", "other"]).default("other"),
  source: z
    .enum(["ninetynine_acres", "magicbricks", "housing", "walkin", "whatsapp", "referral", "other"])
    .default("other"),
  assignedToUserId: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

export const propertyCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  listingType: z.enum(["sale", "rent", "pg", "commercial_lease"]),
  propertyType: z.enum(["apartment", "villa", "plot", "office", "shop", "warehouse", "other"]),
  bhk: z.coerce.number().int().min(0).max(20).optional(),
  carpetSqft: z.coerce.number().int().min(0).optional(),
  builtupSqft: z.coerce.number().int().min(0).optional(),
  superSqft: z.coerce.number().int().min(0).optional(),
  priceAmount: z.coerce.number().positive(),
  priceUnit: z.enum(["lakh", "crore", "per_month", "per_sqft"]),
  negotiable: z.coerce.boolean().optional().default(true),
  maintenanceAmount: z.coerce.number().min(0).optional(),
  depositMonths: z.coerce.number().int().min(0).optional(),
  addressLine: z.string().max(500).optional(),
  locality: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  state: z.string().max(120).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional().or(z.literal("")),
  amenities: z.array(z.string()).optional(),
  furnishing: z.enum(["unfurnished", "semi", "fully"]).optional(),
  facing: z.string().max(40).optional(),
  ageYears: z.coerce.number().int().min(0).max(200).optional(),
  floor: z.coerce.number().int().min(0).max(300).optional(),
  totalFloors: z.coerce.number().int().min(0).max(300).optional(),
  availableFrom: z.coerce.date().optional(),
  status: z.enum(["draft", "active", "under_offer", "closed", "withdrawn"]).default("draft"),
  reraId: z.string().max(60).optional(),
  ownerContactId: z.string().optional().or(z.literal("")),
  photos: z
    .array(z.object({ url: z.string().url(), caption: z.string().optional() }))
    .optional(),
});

export const LEAD_STAGES = [
  "new",
  "contacted",
  "site_visit_scheduled",
  "visited",
  "negotiating",
  "token",
  "agreement",
  "registered",
  "lost",
] as const;

export const leadCreateSchema = z.object({
  contactId: z.string().optional(),
  // If no existing contact, supply these to create one inline:
  contactName: z.string().min(1).max(120).optional(),
  contactPhone: phoneSchema.optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  propertyId: z.string().optional().or(z.literal("")),
  source: z
    .enum(["ninetynine_acres", "magicbricks", "housing", "walkin", "whatsapp", "referral", "other"])
    .default("other"),
  sourceListingId: z.string().optional(),
  intent: z.enum(["buy", "rent", "invest"]).optional(),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional(),
  requirementsText: z.string().max(2000).optional(),
  assignedToUserId: z.string().optional().or(z.literal("")),
  nextFollowupAt: z.coerce.date().optional(),
});

export const leadUpdateSchema = z.object({
  stage: z.enum(LEAD_STAGES).optional(),
  assignedToUserId: z.string().nullable().optional(),
  nextFollowupAt: z.coerce.date().nullable().optional(),
  intent: z.enum(["buy", "rent", "invest"]).nullable().optional(),
  budgetMin: z.coerce.number().min(0).nullable().optional(),
  budgetMax: z.coerce.number().min(0).nullable().optional(),
  requirementsText: z.string().max(2000).nullable().optional(),
  lostReason: z.string().max(500).nullable().optional(),
  propertyId: z.string().nullable().optional(),
});

// Inbound webhook payload: flexible, normalizes loosely. Any of these field names is accepted.
export const inboundLeadSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional(),
  message: z.string().max(2000).optional(),
  propertyId: z.string().optional(),
  source: z.string().optional(),
  budget: z.union([z.string(), z.number()]).optional(),
  intent: z.enum(["buy", "rent", "invest"]).optional(),
});

export const DEAL_STAGES = ["token", "agreement", "registration", "completed", "cancelled"] as const;
export const COMMISSION_ROLES = [
  "sourcing",
  "closing",
  "reference",
  "principal",
  "showing",
  "other",
] as const;

export const dealCreateSchema = z.object({
  propertyId: z.string().min(1),
  buyerContactId: z.string().min(1),
  sellerContactId: z.string().optional().or(z.literal("")),
  leadId: z.string().optional().or(z.literal("")),
  dealType: z.enum(["sale", "rent", "lease"]),
  agreedPrice: z.coerce.number().positive(),
  brokeragePctBuyerSide: z.coerce.number().min(0).max(100).optional(),
  brokeragePctSellerSide: z.coerce.number().min(0).max(100).optional(),
  rentMonthsBuyerSide: z.coerce.number().min(0).max(24).optional(),
  rentMonthsSellerSide: z.coerce.number().min(0).max(24).optional(),
  tokenAmount: z.coerce.number().min(0).optional(),
  tokenDate: z.coerce.date().optional(),
  primaryBrokerUserId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const dealUpdateSchema = z.object({
  stage: z.enum(DEAL_STAGES).optional(),
  agreementDate: z.coerce.date().nullable().optional(),
  registrationDate: z.coerce.date().nullable().optional(),
  tokenDate: z.coerce.date().nullable().optional(),
  tokenAmount: z.coerce.number().min(0).nullable().optional(),
  agreedPrice: z.coerce.number().positive().optional(),
  brokeragePctBuyerSide: z.coerce.number().min(0).max(100).nullable().optional(),
  brokeragePctSellerSide: z.coerce.number().min(0).max(100).nullable().optional(),
  cancelledReason: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const splitCreateSchema = z.object({
  dealId: z.string(),
  userId: z.string().optional().or(z.literal("")),
  externalName: z.string().max(120).optional(),
  externalPhone: z.string().max(20).optional(),
  role: z.enum(COMMISSION_ROLES),
  pctOfTotal: z.coerce.number().min(0).max(100).optional(),
  amount: z.coerce.number().min(0).optional(),
  tdsPct: z.coerce.number().min(0).max(30).optional(),
  notes: z.string().max(500).optional(),
});

export const splitUpdateSchema = z.object({
  status: z.enum(["pending", "payable", "paid", "on_hold"]).optional(),
  paymentMethod: z.enum(["bank_transfer", "upi", "cash", "cheque", "other"]).optional(),
  paymentReference: z.string().max(120).optional(),
  paidAt: z.coerce.date().optional(),
  tdsPct: z.coerce.number().min(0).max(30).optional(),
  pctOfTotal: z.coerce.number().min(0).max(100).nullable().optional(),
  amount: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const invoiceCreateSchema = z.object({
  dealId: z.string(),
  contactId: z.string(),
  invoiceDate: z.coerce.date().optional(),
  brokerageBase: z.coerce.number().positive(),
  gstPct: z.coerce.number().min(0).max(28).optional().default(18),
  billedToState: z.string().max(80).optional(),
  notes: z.string().max(1000).optional(),
});

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type DealCreateInput = z.infer<typeof dealCreateSchema>;
