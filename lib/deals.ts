// Deal-stage presentation + brokerage math.
//   sale / lease : brokerage = agreedPrice × pct%   (per side)
//   rent         : brokerage = monthlyRent × months (per side)
import type { DealStage, DealType } from "@prisma/client";

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  token: "Token",
  agreement: "Agreement",
  registration: "Registration",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  token: "bg-blue-500/15 text-blue-300",
  agreement: "bg-amber-500/15 text-amber-300",
  registration: "bg-emerald-500/15 text-emerald-300",
  completed: "bg-green-500/20 text-green-300",
  cancelled: "bg-red-500/15 text-red-300",
};

export const DEAL_STAGE_ORDER: DealStage[] = ["token", "agreement", "registration", "completed"];

export interface BrokerageInput {
  dealType: DealType;
  agreedPrice: number; // total sale price, or monthly rent for rent deals
  brokeragePctBuyerSide?: number | null;
  brokeragePctSellerSide?: number | null;
  rentMonthsBuyerSide?: number | null;
  rentMonthsSellerSide?: number | null;
}

export interface BrokerageResult {
  buyer: number;
  seller: number;
  total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeBrokerage(input: BrokerageInput): BrokerageResult {
  let buyer = 0;
  let seller = 0;
  if (input.dealType === "rent") {
    buyer = (input.agreedPrice || 0) * (input.rentMonthsBuyerSide || 0);
    seller = (input.agreedPrice || 0) * (input.rentMonthsSellerSide || 0);
  } else {
    buyer = ((input.agreedPrice || 0) * (input.brokeragePctBuyerSide || 0)) / 100;
    seller = ((input.agreedPrice || 0) * (input.brokeragePctSellerSide || 0)) / 100;
  }
  buyer = round2(buyer);
  seller = round2(seller);
  return { buyer, seller, total: round2(buyer + seller) };
}
