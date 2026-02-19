import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import type { Hex, PublicClient } from "viem";

import {
  checkFeeSponsorshipStatus,
  requestFeeTopUp,
  isSponsorshipSupportedChain,
  BASE_CHAIN_ID,
  FEE_SPONSORSHIP_API_KEY,
  type FeeSponsorshipStatusResponse,
  type FeeTopUpResponse,
  type FeeSponsorshipError,
} from "@oko-wallet-attached/requests/fee_sponsorship";

export type SponsorshipState =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "rate_limited"
  | "requesting"
  | "waiting_confirmation"
  | "success"
  | "error";

export interface UseFeeSponsorshipStatusProps {
  simulationKey: string;
  chainId: string;
  recipientAddress: string;
  enabled?: boolean;
}

export interface UseFeeSponsorshipStatusResult {
  data: FeeSponsorshipStatusResponse | undefined;
  error: FeeSponsorshipError | null;
  isLoading: boolean;
  isSupported: boolean;
  refetch: () => void;
}

/**
 * Hook to check fee sponsorship availability
 */
export function useFeeSponsorshipStatus({
  simulationKey,
  chainId,
  recipientAddress,
  enabled = true,
}: UseFeeSponsorshipStatusProps): UseFeeSponsorshipStatusResult {
  const isSupported = isSponsorshipSupportedChain(chainId);
  const hasApiKey = !!FEE_SPONSORSHIP_API_KEY;

  const query = useQuery({
    queryKey: [
      "feeSponsorshipStatus",
      simulationKey,
      chainId,
      recipientAddress,
    ],
    queryFn: async () => {
      const result = await checkFeeSponsorshipStatus(chainId, recipientAddress);

      if (!result.success) {
        throw result.err;
      }

      return result.data;
    },
    enabled: enabled && isSupported && hasApiKey && !!recipientAddress,
    staleTime: 0,
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data,
    error: query.error as FeeSponsorshipError | null,
    isLoading: query.isLoading,
    isSupported,
    refetch: query.refetch,
  };
}

export interface UseRequestFeeTopUpResult {
  requestTopUp: (
    recipientAddress: string,
    amountWei: string,
  ) => Promise<FeeTopUpResponse>;
  isRequesting: boolean;
  error: FeeSponsorshipError | null;
  reset: () => void;
}

/**
 * Hook to request fee top-up
 */
export function useRequestFeeTopUp(): UseRequestFeeTopUpResult {
  const mutation = useMutation({
    mutationFn: async ({
      recipientAddress,
      amountWei,
    }: {
      recipientAddress: string;
      amountWei: string;
    }) => {
      const result = await requestFeeTopUp({
        chainId: BASE_CHAIN_ID,
        recipientAddress,
        amount: amountWei,
      });

      if (!result.success) {
        throw result.err;
      }

      return result.data;
    },
  });

  const requestTopUp = useCallback(
    async (recipientAddress: string, amountWei: string) => {
      return mutation.mutateAsync({ recipientAddress, amountWei });
    },
    [mutation],
  );

  return {
    requestTopUp,
    isRequesting: mutation.isPending,
    error: mutation.error as FeeSponsorshipError | null,
    reset: mutation.reset,
  };
}

export interface UseSponsorshipTimerProps {
  remainingTimeMs: number | undefined;
  enabled?: boolean;
}

export interface UseSponsorshipTimerResult {
  remainingMs: number;
  isExpired: boolean;
  formattedTime: string;
}

/**
 * Hook to manage countdown timer for rate-limited sponsorship
 */
export function useSponsorshipTimer({
  remainingTimeMs,
  enabled = true,
}: UseSponsorshipTimerProps): UseSponsorshipTimerResult {
  const [remainingMs, setRemainingMs] = useState(remainingTimeMs ?? 0);

  useEffect(() => {
    if (remainingTimeMs !== undefined) {
      setRemainingMs((prev) => {
        if (prev <= 0) {
          return remainingTimeMs;
        }
        return Math.min(prev, remainingTimeMs);
      });
    }
  }, [remainingTimeMs]);

  useEffect(() => {
    if (!enabled || remainingMs <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 1000;
        return next > 0 ? next : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, remainingMs > 0]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return {
    remainingMs,
    isExpired: remainingMs <= 0,
    formattedTime,
  };
}

export interface UseBaseSponsorshipFlowProps {
  simulationKey: string;
  chainId: string;
  recipientAddress: string;
  hostOrigin: string;
  estimatedFeeWei: bigint | undefined;
  hasSufficientBalance: boolean | null;
  publicClient?: PublicClient;
  enabled?: boolean;
}

export interface UseBaseSponsorshipFlowResult {
  // State
  sponsorshipState: SponsorshipState;
  isSponsored: boolean;
  isSponsorshipAvailable: boolean;
  isRateLimited: boolean;

  // Whether sponsorship is needed (insufficient balance on supported chain)
  needsSponsorship: boolean;

  // Status data
  statusData: FeeSponsorshipStatusResponse | undefined;
  remainingTimeMs: number;
  formattedRemainingTime: string;

  // Actions
  requestSponsorship: () => Promise<{ txHash: string } | null>;
  resetSponsorship: () => void;

  // Error
  error: FeeSponsorshipError | null;
  errorMessage: string | null;

  // Loading states
  isCheckingStatus: boolean;
  isRequestingTopUp: boolean;
}

/**
 * Main hook for Base chain fee sponsorship flow
 */
export function useBaseSponsorshipFlow({
  simulationKey,
  chainId,
  recipientAddress,
  hostOrigin,
  estimatedFeeWei,
  hasSufficientBalance,
  publicClient,
  enabled = true,
}: UseBaseSponsorshipFlowProps): UseBaseSponsorshipFlowResult {
  const [sponsorshipState, setSponsorshipState] =
    useState<SponsorshipState>("idle");
  const [isSponsored, setIsSponsored] = useState(false);
  const [error, setError] = useState<FeeSponsorshipError | null>(null);

  const isSupported = isSponsorshipSupportedChain(chainId);

  // Sponsorship is needed when balance is insufficient on a supported chain
  const needsSponsorship =
    isSupported && hasSufficientBalance === false && !isSponsored;

  // Check sponsorship status eagerly for supported chains (before balance check completes)
  // This allows us to know if sponsorship is available while simulation is still running
  const shouldCheckStatus =
    enabled && isSupported && sponsorshipState !== "success";

  const {
    data: statusData,
    error: statusError,
    isLoading: isCheckingStatus,
    refetch: refetchStatus,
  } = useFeeSponsorshipStatus({
    simulationKey,
    chainId,
    recipientAddress,
    enabled: shouldCheckStatus,
  });

  const {
    requestTopUp,
    isRequesting: isRequestingTopUp,
    error: topUpError,
    reset: resetTopUp,
  } = useRequestFeeTopUp();

  const {
    remainingMs,
    isExpired,
    formattedTime: formattedRemainingTime,
  } = useSponsorshipTimer({
    remainingTimeMs: statusData?.remainingTimeMs,
    enabled: sponsorshipState === "rate_limited",
  });

  // Update state based on status check result
  useEffect(() => {
    if (!shouldCheckStatus) {
      return;
    }

    if (isCheckingStatus) {
      setSponsorshipState("checking");
      return;
    }

    if (statusError) {
      setSponsorshipState("error");
      setError(statusError);
      return;
    }

    if (statusData) {
      if (statusData.available) {
        setSponsorshipState("available");
      } else if (statusData.remainingTimeMs && statusData.remainingTimeMs > 0) {
        setSponsorshipState("rate_limited");
      } else {
        setSponsorshipState("unavailable");
      }
    }
  }, [shouldCheckStatus, isCheckingStatus, statusData, statusError]);

  // Handle rate limit timer expiry
  useEffect(() => {
    if (sponsorshipState === "rate_limited" && isExpired) {
      refetchStatus();
    }
  }, [sponsorshipState, isExpired, refetchStatus]);

  // Handle top-up error
  useEffect(() => {
    if (topUpError) {
      setSponsorshipState("error");
      setError(topUpError);
    }
  }, [topUpError]);

  const requestSponsorship = useCallback(async (): Promise<{
    txHash: string;
  } | null> => {
    if (!estimatedFeeWei) {
      return null;
    }

    try {
      setSponsorshipState("requesting");
      setError(null);

      // Request 150% of estimated fee to account for gas price fluctuations
      const amountWithBuffer = (estimatedFeeWei * BigInt(150)) / BigInt(100);
      const amountWei = amountWithBuffer.toString();

      const result = await requestTopUp(recipientAddress, amountWei);

      if (publicClient) {
        setSponsorshipState("waiting_confirmation");
        await publicClient.waitForTransactionReceipt({
          hash: result.txHash as Hex,
          confirmations: 1,
        });
      }

      setSponsorshipState("success");
      setIsSponsored(true);

      return { txHash: result.txHash };
    } catch (err) {
      setSponsorshipState("error");
      setError(err as FeeSponsorshipError);
      refetchStatus();
      return null;
    }
  }, [estimatedFeeWei, recipientAddress, requestTopUp, publicClient]);

  const resetSponsorship = useCallback(() => {
    setSponsorshipState("idle");
    setIsSponsored(false);
    setError(null);
    resetTopUp();
  }, [resetTopUp]);

  const errorMessage = error?.message || error?.error || null;

  return {
    sponsorshipState,
    isSponsored,
    isSponsorshipAvailable: sponsorshipState === "available",
    isRateLimited: sponsorshipState === "rate_limited",
    needsSponsorship,

    statusData,
    remainingTimeMs: remainingMs,
    formattedRemainingTime,

    requestSponsorship,
    resetSponsorship,

    error,
    errorMessage,

    isCheckingStatus,
    isRequestingTopUp,
  };
}
