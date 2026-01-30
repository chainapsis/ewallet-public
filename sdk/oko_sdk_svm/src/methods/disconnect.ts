import type {
  OkoSvmWalletInterface,
  OkoSvmWalletInternal,
} from "@oko-wallet-sdk-svm/types";

export async function disconnect(this: OkoSvmWalletInterface): Promise<void> {
  const internal = this as OkoSvmWalletInternal;

  // Remove event listener from core wallet
  this.okoWallet.eventEmitter.off({
    type: "CORE__accountsChanged",
    handler: internal._accountsChangedHandler,
  });

  // Clear session in iframe (clears stored auth token and public key)
  await this.okoWallet.signOut();

  // Clear local state
  this.state.publicKey = null;
  this.state.publicKeyRaw = null;
  this.publicKey = null;
  this.connected = false;

  // Emit disconnect event
  internal._emitter.emit("disconnect");
}
