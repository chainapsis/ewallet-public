import type { OkoWalletInterface } from "@oko-wallet/oko-sdk-core";
import { PublicKey } from "@solana/web3.js";

import type {
  OkoSvmWalletInterface,
  OkoSvmWalletInternal,
  OkoSvmWalletStaticInterface,
  OkoSvmWalletChainOptions,
} from "./types";
import { SvmWalletEventEmitter } from "./emitter";
import { lazyInit } from "./private/lazy_init";

export const OkoSvmWallet = function (
  this: OkoSvmWalletInternal,
  okoWallet: OkoWalletInterface,
  chainOptions: OkoSvmWalletChainOptions,
) {
  this.okoWallet = okoWallet;
  this._chainOptions = chainOptions;
  this.state = {
    publicKey: null,
    publicKeyRaw: null,
    chainId: chainOptions.chain_id,
  };
  this.publicKey = null;
  this.connecting = false;
  this.connected = false;

  this._emitter = new SvmWalletEventEmitter();
  this.on = this._emitter.on.bind(this._emitter) as OkoSvmWalletInterface["on"];
  this.off = this._emitter.off.bind(
    this._emitter,
  ) as OkoSvmWalletInterface["off"];

  this._accountsChangedHandler = async (payload: {
    publicKey: string | null;
  }) => {
    if (payload.publicKey === null) {
      this.state.publicKey = null;
      this.state.publicKeyRaw = null;
      this.publicKey = null;
      this.connected = false;
      this._emitter.emit("accountChanged", null);
    } else {
      // Get Ed25519 key for SVM chains (not secp256k1)
      try {
        const ed25519Key = await this.okoWallet.getPublicKeyEd25519();
        if (ed25519Key && ed25519Key !== this.state.publicKeyRaw) {
          const publicKeyBytes = Buffer.from(ed25519Key, "hex");
          const newPublicKey = new PublicKey(publicKeyBytes);

          this.state.publicKey = newPublicKey;
          this.state.publicKeyRaw = ed25519Key;
          this.publicKey = newPublicKey;
          this.connected = true;
          this._emitter.emit("accountChanged", newPublicKey);
        }
      } catch (e) {
        console.warn(
          "[SVM SDK] Failed to get Ed25519 key on account change:",
          e,
        );
      }
    }
  };

  okoWallet.on({
    type: "CORE__accountsChanged",
    handler: this._accountsChangedHandler,
  });

  this.waitUntilInitialized = lazyInit(this);
} as unknown as OkoSvmWalletStaticInterface;
