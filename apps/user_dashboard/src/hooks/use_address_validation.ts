import { PublicKey } from "@solana/web3.js";
import { useCallback } from "react";

import type { ModularChainInfo } from "@oko-wallet-user-dashboard/types/chain";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

function validateEvmAddress(address: string): ValidationResult {
  if (!EVM_ADDRESS_REGEX.test(address)) {
    return { valid: false, error: "Invalid EVM address" };
  }
  return { valid: true };
}

function validateCosmosAddress(
  address: string,
  chainInfo: ModularChainInfo,
): ValidationResult {
  const bech32Prefix = chainInfo.cosmos?.bech32Config?.bech32PrefixAccAddr;
  if (!bech32Prefix) {
    return { valid: false, error: "Unknown chain bech32 prefix" };
  }

  if (!address.startsWith(`${bech32Prefix}1`)) {
    return {
      valid: false,
      error: `Address must start with "${bech32Prefix}"`,
    };
  }

  // Basic bech32 character validation
  const BECH32_CHARS = /^[a-z]{1,83}1[023456789acdefghjklmnpqrstuvwxyz]+$/;
  if (!BECH32_CHARS.test(address)) {
    return { valid: false, error: "Invalid bech32 address format" };
  }

  if (address.length < 39 || address.length > 65) {
    return { valid: false, error: "Invalid address length" };
  }

  return { valid: true };
}

function validateSvmAddress(address: string): ValidationResult {
  try {
    const pubkey = new PublicKey(address);
    if (!PublicKey.isOnCurve(pubkey)) {
      return { valid: false, error: "Invalid Solana address" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid Solana address" };
  }
}

export function useAddressValidation(
  chainInfo: ModularChainInfo | null,
  senderAddress: string | undefined,
) {
  const validate = useCallback(
    (address: string): ValidationResult => {
      if (!address.trim()) {
        return { valid: false };
      }

      if (!chainInfo) {
        return { valid: false, error: "No chain selected" };
      }

      // Self-send check
      if (
        senderAddress &&
        address.toLowerCase() === senderAddress.toLowerCase()
      ) {
        return { valid: false, error: "Cannot send to your own address" };
      }

      if (chainInfo.evm && !chainInfo.cosmos) {
        return validateEvmAddress(address);
      }

      if (chainInfo.cosmos) {
        return validateCosmosAddress(address, chainInfo);
      }

      if (chainInfo.svm) {
        return validateSvmAddress(address);
      }

      return { valid: false, error: "Unsupported chain type" };
    },
    [chainInfo, senderAddress],
  );

  return { validate };
}
