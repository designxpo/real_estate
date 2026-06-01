// Commission-split math. A split is either a %-of-total-brokerage OR a fixed
// amount, with TDS withheld (Sec 194H default 5%).
export const DEFAULT_TDS_PCT = 5;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface SplitInput {
  totalBrokerage: number;
  pctOfTotal?: number | null;
  amount?: number | null;
  tdsPct?: number | null;
}

export interface SplitResult {
  amount: number; // gross
  tdsPct: number;
  tdsAmount: number;
  netAmount: number; // gross - TDS
}

export function computeSplit(input: SplitInput): SplitResult {
  const gross =
    input.pctOfTotal != null
      ? (input.totalBrokerage * input.pctOfTotal) / 100
      : input.amount ?? 0;
  const amount = round2(gross);
  const tdsPct = input.tdsPct ?? 0;
  const tdsAmount = round2((amount * tdsPct) / 100);
  return { amount, tdsPct, tdsAmount, netAmount: round2(amount - tdsAmount) };
}

// Sum of split percentages, to show coverage of total brokerage in the UI.
export function coveragePct(splits: Array<{ pctOfTotal?: number | null; amount?: number | null }>, total: number): number {
  const sum = splits.reduce((acc, s) => {
    if (s.pctOfTotal != null) return acc + s.pctOfTotal;
    if (s.amount != null && total > 0) return acc + (s.amount / total) * 100;
    return acc;
  }, 0);
  return round2(sum);
}
