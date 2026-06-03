// Zod schemas for the owner (marketplace) API. Kept separate from the broker
// validators so the two surfaces evolve independently.
import { z } from "zod";
import { phoneSchema } from "@/lib/validators";

export const ownerOtpStartSchema = z.object({
  phone: phoneSchema,
});

export const ownerOtpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  name: z.string().min(1).max(120).optional(),
  device: z.string().max(120).optional(),
});

export const ownerRefreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const ownerProfileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional().or(z.literal("")),
});

const listingCore = {
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  listingType: z.enum(["sale", "rent", "pg", "commercial_lease"]),
  propertyType: z.enum(["apartment", "villa", "plot", "office", "shop", "warehouse", "other"]),
  bhk: z.coerce.number().int().min(0).max(20).optional(),
  carpetSqft: z.coerce.number().int().min(0).optional(),
  builtupSqft: z.coerce.number().int().min(0).optional(),
  priceAmount: z.coerce.number().positive(),
  priceUnit: z.enum(["lakh", "crore", "per_month", "per_sqft"]),
  negotiable: z.coerce.boolean().optional(),
  maintenanceAmount: z.coerce.number().min(0).optional(),
  depositMonths: z.coerce.number().int().min(0).optional(),
  addressLine: z.string().max(500).optional(),
  locality: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  state: z.string().max(120).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional().or(z.literal("")),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  amenities: z.array(z.string()).optional(),
  furnishing: z.enum(["unfurnished", "semi", "fully"]).optional(),
  availableFrom: z.coerce.date().optional(),
  reraId: z.string().max(60).optional(),
  // Owner-set exclusivity window: days a broker gets to close after booking.
  bookingWindowDays: z.coerce.number().int().min(1).max(90).optional(),
};

export const ownerListingCreateSchema = z.object(listingCore);

// Update: every field optional, plus the owner-controlled status transitions.
export const ownerListingUpdateSchema = z
  .object({
    ...listingCore,
    title: listingCore.title.optional(),
    listingType: listingCore.listingType.optional(),
    propertyType: listingCore.propertyType.optional(),
    priceAmount: listingCore.priceAmount.optional(),
    priceUnit: listingCore.priceUnit.optional(),
    city: listingCore.city.optional(),
    // Owners may flip among these; "draft -> active" (re)submits for review.
    status: z.enum(["draft", "active", "booked", "inactive"]).optional(),
  })
  .partial();

// Broker-portal: create a managed listing on behalf of an owner. The broker
// supplies the owner's contact (an Owner account is found-or-created by phone)
// plus the full listing. May go live immediately (status: "active").
export const brokerManagedListingCreateSchema = z.object({
  owner: z.object({
    name: z.string().min(1).max(120),
    phone: phoneSchema,
    email: z.string().email().optional().or(z.literal("")),
  }),
  listing: z.object({
    ...listingCore,
    status: z.enum(["draft", "active"]).optional(),
  }),
});

export type BrokerManagedListingCreateInput = z.infer<typeof brokerManagedListingCreateSchema>;

export const photoPresignSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const photoAttachSchema = z.object({
  url: z.string().url(),
  objectKey: z.string().min(1).max(300),
  caption: z.string().max(200).optional(),
  position: z.coerce.number().int().min(0).max(50).optional(),
});

export type OwnerListingCreateInput = z.infer<typeof ownerListingCreateSchema>;
export type OwnerListingUpdateInput = z.infer<typeof ownerListingUpdateSchema>;
