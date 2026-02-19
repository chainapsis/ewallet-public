import type { Result } from "@oko-wallet/stdlib-js";

// Base chain fee sponsorship API endpoint (Keplr fee relayer)
// Production: https://cosmos-fee-relayer.keplr.app
// Local: http://localhost:5200
export const FEE_SPONSORSHIP_ENDPOINT =
  import.meta.env.VITE_FEE_SPONSORSHIP_ENDPOINT ||
  "https://cosmos-fee-relayer.keplr.app";

// API Key for fee sponsorship service
export const FEE_SPONSORSHIP_API_KEY =
  import.meta.env.VITE_FEE_SPONSORSHIP_API_KEY || "";

// Supported chain for fee sponsorship
export const BASE_CHAIN_ID = "eip155:8453";

// Types
export interface FeeTopUpRequest {
  chainId: string;
  recipientAddress: string;
  amount: string; // wei
}

export interface FeeTopUpResponse {
  txHash: string;
}

export interface FeeSponsorshipStatusResponse {
  chainId?: string;
  chainName?: string;
  recipientAddress?: string;
  available: boolean;
  remainingTimeMs?: number;
}

// Raw API response (may differ from our interface)
interface FeeSponsorshipStatusApiResponse {
  isTopUpAvailable: boolean;
  remainingTimeMs?: number;
  chainId?: string;
  chainName?: string;
  recipientAddress?: string;
}

export interface FeeSponsorshipError {
  type: "fetch_error" | "status_fail" | "api_error";
  status?: number;
  error?: string;
  message?: string;
}

/**
 * Check if fee sponsorship is available for a given address on a chain
 */
export async function checkFeeSponsorshipStatus(
  chainId: string,
  recipientAddress: string,
): Promise<Result<FeeSponsorshipStatusResponse, FeeSponsorshipError>> {
  if (!FEE_SPONSORSHIP_API_KEY) {
    return {
      success: false,
      err: {
        type: "api_error",
        message: "Fee sponsorship API key not configured",
      },
    };
  }

  const url = `${FEE_SPONSORSHIP_ENDPOINT}/evm/status/${chainId}?recipientAddress=${recipientAddress}`;

  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": FEE_SPONSORSHIP_API_KEY,
      },
    });

    if (!resp.ok) {
      const errorBody = await resp.json().catch(() => ({}));
      return {
        success: false,
        err: {
          type: "status_fail",
          status: resp.status,
          error: errorBody.error,
          message: errorBody.error || `HTTP ${resp.status}`,
        },
      };
    }

    const rawData = (await resp.json()) as FeeSponsorshipStatusApiResponse;

    // Map API response to our interface
    const data: FeeSponsorshipStatusResponse = {
      chainId: rawData.chainId,
      chainName: rawData.chainName,
      recipientAddress: rawData.recipientAddress,
      available: rawData.isTopUpAvailable,
      remainingTimeMs: rawData.remainingTimeMs,
    };

    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      err: {
        type: "fetch_error",
        message: err.message || "Network error",
      },
    };
  }
}

/**
 * Request a fee top-up (gas sponsorship) for an address
 */
export async function requestFeeTopUp(
  request: FeeTopUpRequest,
): Promise<Result<FeeTopUpResponse, FeeSponsorshipError>> {
  if (!FEE_SPONSORSHIP_API_KEY) {
    return {
      success: false,
      err: {
        type: "api_error",
        message: "Fee sponsorship API key not configured",
      },
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const resp = await fetch(`${FEE_SPONSORSHIP_ENDPOINT}/evm/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": FEE_SPONSORSHIP_API_KEY,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errorBody = await resp.json().catch(() => ({}));
      return {
        success: false,
        err: {
          type: "status_fail",
          status: resp.status,
          error: errorBody.error,
          message: errorBody.error || `HTTP ${resp.status}`,
        },
      };
    }

    const data = (await resp.json()) as FeeTopUpResponse;
    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      err: {
        type: "fetch_error",
        message: err.message || "Network error",
      },
    };
  }
}

/**
 * Check if a chain supports fee sponsorship
 */
export function isSponsorshipSupportedChain(chainId: string): boolean {
  return chainId === BASE_CHAIN_ID;
}

/**
 * Format remaining time in mm:ss format
 */
export function formatRemainingTime(remainingTimeMs: number): string {
  const totalSeconds = Math.ceil(remainingTimeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format remaining time as "X min" for display
 */
export function formatRemainingTimeMinutes(remainingTimeMs: number): string {
  const minutes = Math.ceil(remainingTimeMs / 60000);
  return `${minutes} min`;
}
