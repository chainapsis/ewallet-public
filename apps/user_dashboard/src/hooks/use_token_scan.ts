import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isAlchemySupported } from "@oko-wallet-user-dashboard/constants/alchemy";
import {
  useEthAddress,
  useSVMAddress,
} from "@oko-wallet-user-dashboard/hooks/queries/use_addresses";
import {
  useChains,
  useEnabledChains,
  useGetNativeChainIdentifiers,
} from "@oko-wallet-user-dashboard/hooks/queries/use_chains";
import {
  selectCosmosInitialized,
  selectCosmosSDK,
  selectEthInitialized,
  selectSolInitialized,
  useSDKState,
} from "@oko-wallet-user-dashboard/state/sdk";
import { useUserInfoState } from "@oko-wallet-user-dashboard/state/user_info";
import type { ModularChainInfo } from "@oko-wallet-user-dashboard/types/chain";
import { getChainIdentifier } from "@oko-wallet-user-dashboard/utils/chain";
import {
  getStorageItem,
  setStorageItem,
} from "@oko-wallet-user-dashboard/utils/local_storage";
import { useWorker } from "@oko-wallet-user-dashboard/workers";
import type {
  ScanTarget,
  TokenScanRequest,
  TokenScanResponse,
  TokenScanResult,
} from "@oko-wallet-user-dashboard/workers/token-scan-types";

const STORAGE_KEY = "oko:user_dashboard:token_scan";
// const SCAN_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const SCAN_TTL_MS = 60 * 1000; // 3 hours
const SCAN_RETRY_MS = 30 * 1000; // 30 seconds

interface ScanData {
  results: TokenScanResult[];
  completedAt: number;
  isShowedAutoEnableToast: boolean;
}

function isValidCompletedAt(completedAt: unknown): completedAt is number {
  return (
    typeof completedAt === "number" &&
    Number.isFinite(completedAt) &&
    completedAt > 0 &&
    completedAt <= Date.now() + 60_000
  );
}

function readScanResults(userKey: string): ScanData | null {
  const data = getStorageItem<Record<string, ScanData>>(STORAGE_KEY);
  const entry = data?.[userKey] ?? null;
  if (!entry) {
    return null;
  }
  if (!isValidCompletedAt(entry.completedAt)) {
    return null;
  }
  if (Date.now() - entry.completedAt > SCAN_TTL_MS) {
    return null;
  }
  return entry;
}

function writeScanResults(
  userKey: string,
  results: TokenScanResult[],
  completedAt: number,
  isShowedAutoEnableToast: boolean,
) {
  const data = getStorageItem<Record<string, ScanData>>(STORAGE_KEY) ?? {};
  data[userKey] = { results, completedAt, isShowedAutoEnableToast };
  setStorageItem(STORAGE_KEY, data);
}

function toScanTargets(chain: ModularChainInfo): ScanTarget[] {
  const targets: ScanTarget[] = [];

  if (chain.svm) {
    targets.push({
      chainId: chain.chainId,
      chainName: chain.chainName,
      chainImageUrl: chain.chainSymbolImageUrl,
      type: "svm",
      rpc: chain.svm.rpc,
    });
  }

  if (chain.cosmos?.bech32Config) {
    targets.push({
      chainId: chain.chainId,
      chainName: chain.chainName,
      chainImageUrl: chain.chainSymbolImageUrl,
      type: "cosmos",
      bech32Prefix: chain.cosmos.bech32Config.bech32PrefixAccAddr,
      restEndpoint: chain.cosmos.rest,
    });
  }

  if (chain.evm) {
    targets.push({
      chainId: chain.chainId,
      chainName: chain.chainName,
      chainImageUrl: chain.chainSymbolImageUrl,
      type: "evm",
      rpc: chain.evm.rpc,
      evmChainId: isAlchemySupported(chain.evm.chainId)
        ? chain.evm.chainId
        : undefined,
    });
  }

  return targets;
}

export function useTokenScan() {
  const { request, error } = useWorker<TokenScanRequest, TokenScanResponse>(
    () =>
      new Worker(new URL("../workers/token-scan.worker.ts", import.meta.url)),
    { maxPending: 1 },
  );

  const { authType, publicKey } = useUserInfoState();
  const userKey = authType && publicKey ? `${authType}/${publicKey}` : null;
  const [scanData, setScanData] = useState<ScanData | null>(() => {
    if (!userKey) {
      return null;
    }
    return readScanResults(userKey);
  });

  useEffect(() => {
    if (!userKey) {
      setScanData(null);
      return;
    }
    setScanData(readScanResults(userKey));
  }, [userKey]);

  const { chains: allChains } = useChains();
  const { chains: enabledChains } = useEnabledChains();

  const okoCosmos = useSDKState(selectCosmosSDK);
  const cosmosInitialized = useSDKState(selectCosmosInitialized);
  const ethInitialized = useSDKState(selectEthInitialized);
  const solInitialized = useSDKState(selectSolInitialized);
  const { address: ethAddress } = useEthAddress();
  const { address: svmAddress } = useSVMAddress();

  const nativeChainIdentifiers = useGetNativeChainIdentifiers();

  const scanTargets = useMemo(() => {
    if (nativeChainIdentifiers.length === 0) {
      return [];
    }
    const enabledSet = new Set(
      enabledChains.map((c) => getChainIdentifier(c.chainId)),
    );
    const nativeSet = new Set(nativeChainIdentifiers);
    const filtered = allChains.filter((chain) => {
      if (enabledSet.has(getChainIdentifier(chain.chainId))) {
        return false;
      }
      if (chain.isTestnet || chain.cosmos?.hideInUI) {
        return false;
      }
      if (chain.svm) {
        return true;
      }
      if (chain.cosmos) {
        return nativeSet.has(getChainIdentifier(chain.chainId));
      }
      if (chain.evm) {
        return nativeSet.has(getChainIdentifier(chain.chainId));
      }
      return false;
    });
    return filtered.flatMap((chain) => toScanTargets(chain));
  }, [allChains, enabledChains, nativeChainIdentifiers]);

  const isReady =
    cosmosInitialized &&
    ethInitialized &&
    solInitialized &&
    !!okoCosmos &&
    !!ethAddress &&
    !!svmAddress;

  const isScanningRef = useRef(false);
  const hasRetriedRef = useRef(false);

  const scan = useCallback(async () => {
    if (isScanningRef.current) {
      console.log("[TOKEN-SCAN] Scan already in progress, skipping");
      return;
    }
    if (!isReady || !okoCosmos || !ethAddress || !svmAddress || !userKey) {
      console.log("[TOKEN-SCAN] Not ready, skipping scan", {
        isReady,
        hasOkoCosmos: !!okoCosmos,
        ethAddress: !!ethAddress,
        svmAddress: !!svmAddress,
        userKey,
      });
      return;
    }
    if (scanTargets.length === 0) {
      console.log("[TOKEN-SCAN] No scan targets, skipping");
      return;
    }

    console.log(`[TOKEN-SCAN] Starting scan for ${scanTargets.length} targets`);
    isScanningRef.current = true;

    try {
      const key = await okoCosmos.getKey("cosmoshub-4");
      if (!key?.pubKey) {
        console.log("[TOKEN-SCAN] Failed to get cosmos public key");
        return;
      }
      console.log("[TOKEN-SCAN] Sending request to worker...");
      const sentAt = Date.now();
      const response = await request({
        type: "TOKEN_SCAN",
        cosmosPublicKey: key.pubKey,
        ethAddress,
        svmAddress,
        chains: scanTargets,
      });
      console.log(
        `[TOKEN-SCAN] Scan complete in ${Date.now() - sentAt}ms, ${response.results.length} chain(s) with balances`,
      );
      setScanData({
        results: response.results,
        completedAt: response.completedAt,
        isShowedAutoEnableToast: false,
      });
      writeScanResults(userKey, response.results, response.completedAt, false);
      console.log(
        `[TOKEN-SCAN] Results saved. completedAt: ${new Date(response.completedAt).toISOString()}`,
      );
      hasRetriedRef.current = false;
    } catch (err) {
      console.error("[TOKEN-SCAN] Scan failed:", err);
      // Stop after 1 retry
      if (!hasRetriedRef.current) {
        hasRetriedRef.current = true;
        console.log(`[TOKEN-SCAN] Will retry in ${SCAN_RETRY_MS / 1000}s`);
        window.setTimeout(() => {
          isScanningRef.current = false;
          scan();
        }, SCAN_RETRY_MS);
        return;
      }
      console.log("[TOKEN-SCAN] Already retried once, giving up");
    } finally {
      isScanningRef.current = false;
    }
  }, [
    isReady,
    okoCosmos,
    ethAddress,
    svmAddress,
    userKey,
    scanTargets,
    request,
  ]);

  useEffect(() => {
    if (!isReady || scanTargets.length === 0) {
      console.log("[TOKEN-SCAN] Cache check: not ready or no targets", {
        isReady,
        targets: scanTargets.length,
      });
      return;
    }

    if (!scanData?.completedAt) {
      console.log("[TOKEN-SCAN] No cached results, triggering initial scan");
      scan();
      return;
    }

    const cacheAge = Date.now() - scanData.completedAt;
    const cacheRemainingTime = SCAN_TTL_MS - cacheAge;

    console.log(`[TOKEN-SCAN] Cache status:`, {
      completedAt: new Date(scanData.completedAt).toISOString(),
      cacheAgeMs: cacheAge,
      cacheAgeSec: Math.round(cacheAge / 1000),
      ttlMs: SCAN_TTL_MS,
      ttlSec: Math.round(SCAN_TTL_MS / 1000),
      remainingMs: cacheRemainingTime,
      remainingSec: Math.round(cacheRemainingTime / 1000),
      expired: cacheRemainingTime <= 0,
    });

    if (cacheRemainingTime <= 0) {
      console.log("[TOKEN-SCAN] Cache expired, triggering re-scan");
      scan();
      return;
    }

    console.log(
      `[TOKEN-SCAN] Cache valid, next scan in ${Math.round(cacheRemainingTime / 1000)}s`,
    );
    const timer = window.setTimeout(() => {
      console.log("[TOKEN-SCAN] Cache timer fired, triggering re-scan");
      scan();
    }, cacheRemainingTime);
    return () => window.clearTimeout(timer);
  }, [isReady, scanTargets, scanData?.completedAt, scan]);

  const markToastShown = useCallback(() => {
    if (!userKey || !scanData) {
      return;
    }
    const updated = { ...scanData, isShowedAutoEnableToast: true };
    setScanData(updated);
    writeScanResults(userKey, updated.results, updated.completedAt, true);
  }, [userKey, scanData]);

  return {
    scan,
    results: scanData?.results ?? [],
    completedAt: scanData?.completedAt ?? null,
    isShowedAutoEnableToast: scanData?.isShowedAutoEnableToast ?? true,
    markToastShown,
    isReady,
    error,
  };
}
