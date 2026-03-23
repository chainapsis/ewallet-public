import { ripemd160 } from "@noble/hashes/legacy";
import { sha256 } from "@noble/hashes/sha2";
import { bech32 } from "bech32";

import type {
  ScanTarget,
  TokenScanRequest,
  TokenScanResponse,
  TokenScanResult,
} from "./token-scan-types";
import { createWorkerHandler } from "./worker-helper";
import { getAlchemyEndpoint } from "@oko-wallet-user-dashboard/constants/alchemy";
import { fetchCosmosRawBalances } from "@oko-wallet-user-dashboard/fetch/cosmos_balances";
import { fetchErc20TokenBalances } from "@oko-wallet-user-dashboard/fetch/erc20_token_balances";
import { fetchEvmNativeBalance } from "@oko-wallet-user-dashboard/fetch/evm_native_balance";
import { fetchSplTokenBalances } from "@oko-wallet-user-dashboard/fetch/spl_token_balances";
import { fetchSvmNativeBalance } from "@oko-wallet-user-dashboard/fetch/svm_native_balance";
import type { RawBalance } from "@oko-wallet-user-dashboard/types";

createWorkerHandler<TokenScanRequest, TokenScanResponse>((router) => {
  router.route("TOKEN_SCAN", async (msg) => {
    const chains: ScanTarget[] = msg.chains;
    const settled = await mapConcurrent(chains, 10, (chain) =>
      scanChain(chain, msg),
    );

    const filtered = settled
      .filter(
        (r): r is PromiseFulfilledResult<TokenScanResult | null> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value)
      .filter((r): r is TokenScanResult => r != null);

    return {
      type: "TOKEN_SCAN_RESULT",
      results: filtered,
      completedAt: Date.now(),
    };
  });
});

async function scanChain(
  chain: ScanTarget,
  msg: TokenScanRequest,
): Promise<TokenScanResult | null> {
  try {
    const { address, balances } = await (async () => {
      switch (chain.type) {
        case "cosmos": {
          const addr = deriveBech32Address(
            msg.cosmosPublicKey,
            chain.bech32Prefix,
          );
          const rawBalances = await fetchCosmosRawBalances(
            chain.restEndpoint,
            addr,
            { paginationLimit: 1000 },
          );
          const balances: RawBalance[] = rawBalances
            .filter((b) => b?.denom && b?.amount && b.amount !== "0")
            .map((b) => ({ denom: b.denom, amount: b.amount }));
          return { address: addr, balances };
        }
        case "evm": {
          const addr = msg.ethAddress;
          const nativeAmount = await fetchEvmNativeBalance(chain.rpc, addr);
          const balances: RawBalance[] =
            nativeAmount !== "0"
              ? [{ denom: "native", amount: nativeAmount }]
              : [];
          if (chain.evmChainId != null) {
            const endpoint = getAlchemyEndpoint(chain.evmChainId);
            const erc20Results = await fetchErc20TokenBalances(endpoint, addr);
            for (const res of erc20Results) {
              balances.push({
                denom: res.contractAddress,
                amount: res.tokenBalance,
              });
            }
          }
          return { address: addr, balances };
        }
        case "svm": {
          const addr = msg.svmAddress;
          const [nativeResult, splResult] = await Promise.allSettled([
            fetchSvmNativeBalance(chain.rpc, addr),
            fetchSplTokenBalances(chain.rpc, addr),
          ]);
          const balances: RawBalance[] = [];
          if (
            nativeResult.status === "fulfilled" &&
            nativeResult.value !== "0"
          ) {
            balances.push({ denom: "native", amount: nativeResult.value });
          }
          if (splResult.status === "fulfilled") {
            for (const spl of splResult.value) {
              balances.push({ denom: spl.mint, amount: spl.amount });
            }
          }
          return { address: addr, balances };
        }
      }
    })();

    if (balances.length === 0) {
      return null;
    }

    return {
      chainId: chain.chainId,
      chainName: chain.chainName,
      chainImageUrl: chain.chainImageUrl,
      chainType: chain.type,
      address,
      balances,
    };
  } catch {
    return null;
  }
}

function deriveBech32Address(pubKey: Uint8Array, prefix: string): string {
  const sha256Hash = sha256(pubKey);
  const ripemd160Hash = ripemd160(sha256Hash);
  const words = bech32.toWords(ripemd160Hash);
  return bech32.encode(prefix, words);
}

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  let index = 0;

  async function next(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.allSettled(
    Array.from({ length: Math.min(limit, items.length) }, () => next()),
  );
  return results;
}
