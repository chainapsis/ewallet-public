import type { Result } from "@oko-wallet/stdlib-js";

import type { LazyInitError } from "@oko-wallet-sdk-cosmos/errors";
import type {
  OkoCosmosWalletInterface,
  OkoCosmosWalletState,
} from "@oko-wallet-sdk-cosmos/types";

export async function lazyInit(
  okoCosmosWallet: OkoCosmosWalletInterface,
): Promise<Result<OkoCosmosWalletState, LazyInitError>> {
  const walletStateRes = await okoCosmosWallet.okoWallet.waitUntilInitialized;

  if (!walletStateRes.success) {
    return {
      success: false,
      err: { type: "oko_cosmos_wallet_lazy_init_fail" },
    };
  }

  setUpEventHandlers.call(okoCosmosWallet);

  const walletState = walletStateRes.data;
  if (walletState.publicKey) {
    const pk = Buffer.from(walletState.publicKey, "hex");

    okoCosmosWallet.state = {
      publicKey: pk,
      publicKeyRaw: walletState.publicKey,
    };

    okoCosmosWallet.eventEmitter.emit({
      type: "accountsChanged",
      authType: walletState.authType,
      email: walletState.email,
      publicKey: pk,
      name: walletState.name,
    });
  } else {
    okoCosmosWallet.state = {
      publicKey: null,
      publicKeyRaw: null,
    };

    okoCosmosWallet.eventEmitter.emit({
      type: "accountsChanged",
      authType: walletState.authType,
      email: walletState.email,
      publicKey: null,
      name: walletState.name,
    });
  }

  return { success: true, data: okoCosmosWallet.state };
}

export function setUpEventHandlers(this: OkoCosmosWalletInterface): void {
  console.log("[oko-cosmos] set up event handlers");

  this.okoWallet.on({
    type: "CORE__accountsChanged",
    handler: (payload) => {
      console.log(
        "[oko-cosmos] CORE__accountsChanged callback, payload: %s",
        JSON.stringify(payload),
      );

      const { publicKey, email, name, authType } = payload;

      if (this.state.publicKeyRaw !== publicKey) {
        if (publicKey !== null) {
          const pk = Buffer.from(publicKey, "hex");

          this.state = {
            publicKey: pk,
            publicKeyRaw: publicKey,
          };
        } else {
          this.state = {
            publicKey: null,
            publicKeyRaw: null,
          };
        }

        this.eventEmitter.emit({
          type: "accountsChanged",
          email: email,
          publicKey: this.state.publicKey,
          name,
          authType,
        });
      }
    },
  });

  this.okoWallet.on({
    type: "CORE__chainChanged",
    handler: (_payload) => {
      this.eventEmitter.emit({ type: "chainChanged" });
    },
  });
}
