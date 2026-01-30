import { PublicKey } from "@solana/web3.js";

import type {
  OkoSvmWalletInterface,
  OkoSvmWalletInternal,
} from "@oko-wallet-sdk-svm/types";

export async function connect(this: OkoSvmWalletInterface): Promise<void> {
  if (this.connected) {
    return;
  }

  this.connecting = true;

  try {
    await this.waitUntilInitialized;

    // SVM chains use Ed25519, not secp256k1
    const publicKeyHex = await this.okoWallet.getPublicKeyEd25519();

    if (!publicKeyHex) {
      throw new Error("No Ed25519 key found. Please sign in first.");
    }

    const publicKeyBytes = Buffer.from(publicKeyHex, "hex");

    if (publicKeyBytes.length !== 32) {
      throw new Error(
        `Invalid public key length: expected 32 bytes, got ${publicKeyBytes.length}`,
      );
    }

    const publicKey = new PublicKey(publicKeyBytes);

    this.state.publicKey = publicKey;
    this.state.publicKeyRaw = publicKeyHex;
    this.publicKey = publicKey;
    this.connected = true;

    // Emit connect event
    (this as OkoSvmWalletInternal)._emitter.emit("connect", publicKey);
  } finally {
    this.connecting = false;
  }
}
