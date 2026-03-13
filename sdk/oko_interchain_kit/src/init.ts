import type { OkoCosmosWalletInterface } from "@oko-wallet/oko-sdk-cosmos";
import { OkoCosmosWallet } from "@oko-wallet/oko-sdk-cosmos";

import type { OkoWalletOptions } from "./types";

export function initializeOkoCosmosWallet(
  options: OkoWalletOptions,
): OkoCosmosWalletInterface {
  const cosmosWalletResult = OkoCosmosWallet.init({
    api_key: options.apiKey,
    sdk_endpoint: options.sdkEndpoint,
  });

  if (!cosmosWalletResult.success) {
    throw new Error(
      `Failed to initialize OkoCosmosWallet: ${
        (cosmosWalletResult as any).err?.msg || "Unknown error"
      }`,
    );
  }

  return cosmosWalletResult.data;
}
