import { useEffect, useState } from "react";

import { useSDKState } from "@/state/sdk";
import { useUserInfoState } from "@/state/user_info";

export interface CosmosChainAccount {
  chainId: string;
  chainName: string;
  address: string;
  pubkey: Uint8Array;
}

export function useCosmosAccounts() {
  const okoCosmos = useSDKState((state) => state.oko_cosmos);
  const { isSignedIn } = useUserInfoState();

  const [accounts, setAccounts] = useState<CosmosChainAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!isSignedIn || !okoCosmos) {
        setAccounts([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const [chainInfos, accountList] = await Promise.all([
          okoCosmos.getCosmosChainInfo(),
          okoCosmos.getAccounts(),
        ]);

        const byPrefix = new Map<string, (typeof chainInfos)[number]>();
        for (const chainInfo of chainInfos) {
          const prefix = chainInfo.bech32Config?.bech32PrefixAccAddr;
          if (chainInfo.isTestnet) {
            continue;
          }

          if (prefix) {
            byPrefix.set(prefix, chainInfo);
          }
        }

        const merged: CosmosChainAccount[] = [];
        for (const account of accountList) {
          const addressPrefix = account.address.split("1")[0] ?? "";
          const chainInfo = byPrefix.get(addressPrefix);
          if (!chainInfo) {
            continue;
          }

          merged.push({
            chainId: chainInfo.chainId,
            chainName: chainInfo.chainName,
            address: account.address,
            pubkey: account.pubkey,
          });
        }

        // For testnet, the prefix is the same as mainnet, so duplicates are removed here.
        const seen = new Set<string>();
        const unique: CosmosChainAccount[] = [];
        for (const item of merged) {
          const k = `${item.chainName}:${item.chainId}:${item.address}`;
          if (seen.has(k)) {
            continue;
          }
          seen.add(k);
          unique.push(item);
        }

        unique.sort(
          (a, b) =>
            a.chainName.localeCompare(b.chainName) ||
            a.chainId.localeCompare(b.chainId),
        );

        setAccounts(unique);
      } catch (err: any) {
        console.error("Failed to load cosmos accounts:", err);
        setError(err?.message ?? "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    load().then();
  }, [isSignedIn, okoCosmos]);

  return { accounts, isLoading, error };
}
