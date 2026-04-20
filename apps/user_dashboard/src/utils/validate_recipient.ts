import { Bech32Address } from "@keplr-wallet/cosmos";

export function validateCosmosRecipient(
  address: string,
  bech32Prefix: string,
): string | undefined {
  const trimmed = address.trim();
  if (!trimmed) {
    return "Recipient address is required";
  }

  try {
    Bech32Address.validate(trimmed, bech32Prefix);
  } catch {
    return `Invalid ${bech32Prefix} address`;
  }

  return undefined;
}
