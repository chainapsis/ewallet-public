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
import { useAssetMetaStore } from "@oko-wallet-user-dashboard/store/asset_meta";
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
interface ScanData {
  results: TokenScanResult[];
  completedAt: number;
  isShowedAutoEnableToast: boolean;
}

function readScanResults(userKey: string): ScanData | null {
  const data = getStorageItem<Record<string, ScanData>>(STORAGE_KEY);
  return data?.[userKey] ?? null;
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

  const resolveTokenMetadata = useAssetMetaStore(
    (state) => state.resolveTokenMetadata,
  );

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

  const hasFiredRef = useRef(false);

  const scan = useCallback(async () => {
    if (!isReady || !okoCosmos || !ethAddress || !svmAddress || !userKey) {
      return;
    }
    if (scanTargets.length === 0) {
      return;
    }
    hasFiredRef.current = true;

    try {
      const key = await okoCosmos.getKey("cosmoshub-4");
      if (!key?.pubKey) {
        return;
      }
      const response = await request({
        type: "TOKEN_SCAN",
        cosmosPublicKey: key.pubKey,
        ethAddress,
        svmAddress,
        chains: scanTargets,
      });
      setScanData({
        results: response.results,
        completedAt: response.completedAt,
        isShowedAutoEnableToast: false,
      });
      writeScanResults(userKey, response.results, response.completedAt, false);
    } catch {
      // scan failed silently
    }
  }, [
    isReady,
    okoCosmos,
    ethAddress,
    svmAddress,
    userKey,
    scanTargets,
    request,
    resolveTokenMetadata,
  ]);

  useEffect(() => {
    if (isReady && scanTargets.length > 0 && !hasFiredRef.current) {
      scan();
    }
  }, [isReady, scanTargets, scan]);

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
