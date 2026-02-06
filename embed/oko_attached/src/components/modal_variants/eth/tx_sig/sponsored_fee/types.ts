import type { SponsorshipState } from "@oko-wallet-attached/web3/ethereum/queries/use_fee_sponsorship";

export interface SponsoredFeeInfo {
  state: SponsorshipState;
  originalFee: string; // e.g., "0.00003 ETH"
  remainingTimeMs: number;
  formattedRemainingTime: string; // e.g., "3:42" or "5 min"
  errorMessage: string | null;
}

export type SponsoredFeeVariant = "normal" | "loading" | "timer" | "error";

export function getSponsoredFeeVariant(state: SponsorshipState): SponsoredFeeVariant {
  switch (state) {
    case "requesting":
    case "waiting_confirmation":
      return "loading";
    case "rate_limited":
      return "timer";
    case "error":
      return "error";
    default:
      return "normal";
  }
}
