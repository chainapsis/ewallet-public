import type {
  Hex,
  Address,
  ByteArray,
  AddEthereumChainParameter as Chain,
} from "viem";
import { publicKeyToAddress } from "viem/accounts";
import { secp256k1 } from "@noble/curves/secp256k1";

export const publicKeyToEthereumAddress = (
  publicKey: Hex | ByteArray,
): Address => {
  let publicKeyWithout0x: string | ByteArray = publicKey;
  if (typeof publicKey === "string" && publicKey.startsWith("0x")) {
    publicKeyWithout0x = publicKey.slice(2);
  }

  const point = secp256k1.Point.fromHex(publicKeyWithout0x);

  const uncompressedPublicKey: Hex = `0x${point.toHex(false)}`;

  // ethereum address should be generated from uncompressed public key
  return publicKeyToAddress(uncompressedPublicKey);
};

export const isValidChainId = (chainId: unknown): chainId is string =>
  Boolean(chainId) && typeof chainId === "string" && chainId.startsWith("0x");

/**
 * Check if a URL string is valid
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate chain ID format and value
 * @param chainId - The chain ID to validate
 * @returns Object with validation result and decimal value
 */
export const validateChainIdFormat = (
  chainId: string,
): {
  isValid: boolean;
  decimalValue?: number;
  error?: string;
} => {
  try {
    const decimalChainId = parseInt(chainId, 16);

    // Ensure the chain ID is a 0x-prefixed hexadecimal string and can be parsed to an integer
    if (!/^0x[0-9a-fA-F]+$/.test(chainId) || isNaN(decimalChainId)) {
      return { isValid: false, error: "Invalid chain ID format" };
    }

    // Validate chain ID value is not greater than max safe integer value
    if (decimalChainId > Number.MAX_SAFE_INTEGER) {
      return {
        isValid: false,
        error: "Chain ID value exceeds maximum safe integer",
      };
    }

    return { isValid: true, decimalValue: decimalChainId };
  } catch (error) {
    return { isValid: false, error: "Invalid chain ID format" };
  }
};

/**
 * Validate RPC URLs array
 * @param rpcUrls - Array of RPC URLs to validate
 * @returns Validation result
 */
export const validateRpcUrls = (
  rpcUrls: readonly string[],
): {
  isValid: boolean;
  error?: string;
} => {
  if (!rpcUrls || rpcUrls.length === 0) {
    return { isValid: false, error: "RPC URLs are required" };
  }

  for (const url of rpcUrls) {
    if (!isValidUrl(url)) {
      return { isValid: false, error: `Invalid RPC URL: ${url}` };
    }
  }

  return { isValid: true };
};

/**
 * Validate block explorer URLs array
 * @param blockExplorerUrls - Array of block explorer URLs to validate
 * @returns Validation result
 */
export const validateBlockExplorerUrls = (
  blockExplorerUrls?: readonly string[],
): {
  isValid: boolean;
  error?: string;
} => {
  if (!blockExplorerUrls) {
    return { isValid: true }; // Optional field
  }

  if (!Array.isArray(blockExplorerUrls) || blockExplorerUrls.length === 0) {
    return {
      isValid: false,
      error: "Block explorer URLs must be a non-empty array",
    };
  }

  for (const url of blockExplorerUrls) {
    if (!isValidUrl(url)) {
      return { isValid: false, error: `Invalid block explorer URL: ${url}` };
    }
  }

  return { isValid: true };
};

/**
 * Validate native currency symbol
 * @param symbol - The currency symbol to validate
 * @returns Validation result
 */
export const validateNativeCurrencySymbol = (
  symbol: string,
): {
  isValid: boolean;
  error?: string;
} => {
  if (symbol.length < 2 || symbol.length > 6) {
    return {
      isValid: false,
      error: "Native currency symbol must be between 2-6 characters",
    };
  }

  return { isValid: true };
};

/**
 * Validate complete chain information
 * @param chain - The chain to validate
 * @param addedChains - Existing chains to check for duplicates
 * @returns Validation result with detailed error information
 */
export const validateChain = (
  chain: Chain,
  addedChains: readonly Chain[],
): {
  isValid: boolean;
  error?: string;
  errorType?:
    | "DUPLICATE_CHAIN"
    | "INVALID_CHAIN_ID"
    | "INVALID_RPC_URLS"
    | "INVALID_BLOCK_EXPLORER_URLS"
    | "INVALID_NATIVE_CURRENCY"
    | "CURRENCY_SYMBOL_MISMATCH";
  errorData?: any;
} => {
  const { rpcUrls, blockExplorerUrls, chainId, nativeCurrency } = chain;

  // Check if chain already exists
  if (addedChains.some((c) => c.chainId === chainId)) {
    return {
      isValid: false,
      error: "Chain already added",
      errorType: "DUPLICATE_CHAIN",
      errorData: { chainId },
    };
  }

  // Validate chain ID format and value
  const chainIdResult = validateChainIdFormat(chainId);
  if (!chainIdResult.isValid) {
    return {
      isValid: false,
      error: chainIdResult.error,
      errorType: "INVALID_CHAIN_ID",
      errorData: { chainId },
    };
  }

  // Validate RPC URLs
  const rpcResult = validateRpcUrls(rpcUrls);
  if (!rpcResult.isValid) {
    return {
      isValid: false,
      error: rpcResult.error,
      errorType: "INVALID_RPC_URLS",
      errorData: { rpcUrls },
    };
  }

  // Validate block explorer URLs
  const blockExplorerResult = validateBlockExplorerUrls(blockExplorerUrls);
  if (!blockExplorerResult.isValid) {
    return {
      isValid: false,
      error: blockExplorerResult.error,
      errorType: "INVALID_BLOCK_EXPLORER_URLS",
      errorData: { blockExplorerUrls },
    };
  }

  // Validate native currency
  if (nativeCurrency) {
    const symbolResult = validateNativeCurrencySymbol(nativeCurrency.symbol);
    if (!symbolResult.isValid) {
      return {
        isValid: false,
        error: symbolResult.error,
        errorType: "INVALID_NATIVE_CURRENCY",
        errorData: { symbol: nativeCurrency.symbol },
      };
    }

    // Check for native currency symbol mismatch with existing chain
    const existingChain = addedChains.find((c) => c.chainId === chainId);
    if (
      existingChain &&
      existingChain.nativeCurrency &&
      existingChain.nativeCurrency.symbol !== nativeCurrency.symbol
    ) {
      return {
        isValid: false,
        error: "Native currency symbol mismatch with existing chain",
        errorType: "CURRENCY_SYMBOL_MISMATCH",
        errorData: {
          chainId,
          existing: existingChain.nativeCurrency.symbol,
          provided: nativeCurrency.symbol,
        },
      };
    }
  }

  return { isValid: true };
};
