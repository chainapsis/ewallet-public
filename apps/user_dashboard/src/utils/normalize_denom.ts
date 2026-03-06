export function normalizeIBCDenom(denom: string): string {
  if (denom.startsWith("ibc/")) {
    return denom.slice(0, 4) + denom.slice(4).toUpperCase();
  }
  return denom;
}
