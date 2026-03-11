import { CoinPretty, Dec, Int } from "@keplr-wallet/unit";

import type { Currency } from "@oko-wallet-user-dashboard/types/chain";

const MIN_DISPLAY_THRESHOLD = new Dec("0.000001");

/**
 * Formats a raw token amount for display with up to 6 decimal places.
 * Returns "< 0.000001" for non-zero amounts smaller than 0.000001.
 */
export function formatDisplayBalance(
  rawAmount: string,
  currency: Currency,
): string {
  const coin = new CoinPretty(currency, new Dec(rawAmount));
  const decAmount = coin.toDec();
  if (decAmount.gt(new Dec(0)) && decAmount.lt(MIN_DISPLAY_THRESHOLD)) {
    return "< 0.000001";
  }
  return coin.maxDecimals(6).trim(true).shrink(true).hideDenom(true).toString();
}

/**
 * Converts a raw token amount (in smallest unit) to a decimal value.
 *
 * Uses Dec from @keplr-wallet/unit for precise decimal arithmetic,
 * avoiding floating point precision issues.
 *
 * @example
 * formatTokenAmount("1000000", 6) // returns Dec representing 1
 * formatTokenAmount("1000000000000000000", 18) // returns Dec representing 1
 */
export function formatTokenAmount(
  rawAmount: string | number | bigint,
  decimals: number,
): Dec {
  const amount = new Dec(String(rawAmount));
  const divisor = new Dec(10).pow(new Int(decimals));
  return amount.quo(divisor);
}

/**
 * Calculates the USD value of a token amount with precise decimal arithmetic.
 *
 * @example
 * calculateUsdValue("1000000", 6, 1.0) // 1.0 USDC at $1 = 1.0
 */
export function calculateUsdValue(
  rawAmount: string | number | bigint,
  decimals: number,
  priceUsd: number,
): number {
  const amount = formatTokenAmount(rawAmount, decimals);
  const price = new Dec(priceUsd);
  return parseFloat(amount.mul(price).toString());
}
