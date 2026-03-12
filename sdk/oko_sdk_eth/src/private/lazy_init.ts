import type { Result } from "@oko-wallet/stdlib-js";
import type { Hex } from "viem";

import type { LazyInitError } from "@oko-wallet-sdk-eth/errors";
import type {
  OkoEthWalletInterface,
  OkoEthWalletState,
} from "@oko-wallet-sdk-eth/types";
import { publicKeyToEthereumAddress } from "@oko-wallet-sdk-eth/utils";

export async function lazyInit(
  okoEthWallet: OkoEthWalletInterface,
): Promise<Result<OkoEthWalletState, LazyInitError>> {
  console.log("[oko-eth] lazy init for oko-eth wallet");

  const okoEthWalletRes = await okoEthWallet.okoWallet.waitUntilInitialized;

  if (!okoEthWalletRes.success) {
    return { success: false, err: { type: "oko_eth_wallet_lazy_init_fail" } };
  }

  const okoEthWalletState = okoEthWalletRes.data;

  if (okoEthWalletState.publicKey) {
    // ensure not missing initial state change
    handleAccountsChanged.call(okoEthWallet, okoEthWalletState.publicKey);
  }

  setUpEventHandlers.call(okoEthWallet);

  console.log(
    "[oko-eth] lazy init for oko-eth wallet complete, \
    publicKeyRaw: %s, publicKey: %s, address: %s",
    okoEthWallet.state.publicKeyRaw,
    okoEthWallet.state.publicKey,
    okoEthWallet.state.address,
  );

  return {
    success: true,
    data: okoEthWallet.state,
  };
}

function setUpEventHandlers(this: OkoEthWalletInterface) {
  this.okoWallet.on({
    type: "CORE__accountsChanged",
    handler: (payload) => handleAccountsChanged.call(this, payload.publicKey),
  });
}

function handleAccountsChanged(
  this: OkoEthWalletInterface,
  publicKey: string | null,
) {
  console.log("[oko-eth] detect account change", publicKey);

  const currentPublicKeyRaw = normalizeKey(this.state.publicKeyRaw);
  const publicKeyNormalized = normalizeKey(publicKey);

  const changed = currentPublicKeyRaw !== publicKeyNormalized;

  // only emit `accountsChanged` event if public key changed
  if (changed) {
    console.log(
      "[oko-eth] account change detected, from: %s to: %s",
      currentPublicKeyRaw,
      publicKeyNormalized,
    );

    this.getEthereumProvider().then((provider) => {
      if (publicKeyNormalized === null) {
        this.state = {
          publicKey: null,
          publicKeyRaw: null,
          address: null,
        };

        provider.emit("accountsChanged", []);
        return;
      } else {
        const publicKeyHex: Hex = `0x${publicKeyNormalized}`;
        const nextAddress = publicKeyToEthereumAddress(publicKeyHex);

        this.state = {
          publicKeyRaw: publicKey,
          publicKey: publicKeyHex,
          address: nextAddress,
        };

        provider.emit("accountsChanged", [nextAddress]);
      }
    });
  }
}

function normalizeKey(key: string | null): string | null {
  if (key === null || key === "") {
    return null;
  }

  if (key.toLowerCase().startsWith("0x")) {
    return key.slice(2).toLowerCase();
  } else {
    return key.toLowerCase();
  }
}
