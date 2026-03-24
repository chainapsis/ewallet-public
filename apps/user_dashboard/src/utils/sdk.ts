import type { OkoCosmosWalletInterface } from "@oko-wallet/oko-sdk-cosmos";
import type { OkoEthWalletInterface } from "@oko-wallet/oko-sdk-eth";
import type { OkoSvmWalletInterface } from "@oko-wallet/oko-sdk-svm";
import { PublicKey } from "@solana/web3.js";

export async function refreshSvmEd25519Key(
  svmWallet: OkoSvmWalletInterface,
): Promise<boolean> {
  try {
    const ed25519Key = await svmWallet.okoWallet.getPublicKeyEd25519();
    if (!ed25519Key) {
      return false;
    }

    const publicKeyBytes = Buffer.from(ed25519Key, "hex");
    const newPublicKey = new PublicKey(publicKeyBytes);

    svmWallet.state.publicKey = newPublicKey;
    svmWallet.state.publicKeyRaw = ed25519Key;
    svmWallet.publicKey = newPublicKey;
    svmWallet.connected = true;

    return true;
  } catch (e) {
    console.warn("[SVM SDK] Failed to refresh Ed25519 key:", e);
    return false;
  }
}

export function resetSDKStates(
  ethWallet: OkoEthWalletInterface | null,
  cosmosWallet: OkoCosmosWalletInterface | null,
  svmWallet: OkoSvmWalletInterface | null,
) {
  if (ethWallet) {
    ethWallet.state.publicKey = null;
    ethWallet.state.publicKeyRaw = null;
    ethWallet.state.address = null;
  }

  if (cosmosWallet) {
    cosmosWallet.state.publicKey = null;
    cosmosWallet.state.publicKeyRaw = null;
  }

  if (svmWallet) {
    svmWallet.state.publicKey = null;
    svmWallet.state.publicKeyRaw = null;
    svmWallet.publicKey = null;
    svmWallet.connected = false;
  }
}
