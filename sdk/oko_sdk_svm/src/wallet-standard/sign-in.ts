import type { SolanaSignInInput } from "@solana/wallet-standard-features";

import { OkoSvmWalletAccount } from "./account";
import type { WalletStandardConfig } from "./chains";
import type { OkoSvmWalletInterface } from "@oko-wallet-sdk-svm/types";

export function buildSignInMessage(
  input: SolanaSignInInput,
  address: string,
): string {
  const lines: string[] = [];

  const domain = input.domain ?? window.location.host;
  lines.push(`${domain} wants you to sign in with your Solana account:`);
  lines.push(input.address ?? address);

  if (input.statement) {
    lines.push("");
    lines.push(input.statement);
  }

  lines.push("");

  if (input.uri) {
    lines.push(`URI: ${input.uri}`);
  }

  if (input.version) {
    lines.push(`Version: ${input.version}`);
  }

  if (input.chainId) {
    lines.push(`Chain ID: ${input.chainId}`);
  }

  if (input.nonce) {
    lines.push(`Nonce: ${input.nonce}`);
  }

  if (input.issuedAt) {
    lines.push(`Issued At: ${input.issuedAt}`);
  }

  if (input.expirationTime) {
    lines.push(`Expiration Time: ${input.expirationTime}`);
  }

  if (input.notBefore) {
    lines.push(`Not Before: ${input.notBefore}`);
  }

  if (input.requestId) {
    lines.push(`Request ID: ${input.requestId}`);
  }

  if (input.resources && input.resources.length > 0) {
    lines.push("Resources:");
    for (const resource of input.resources) {
      lines.push(`- ${resource}`);
    }
  }

  return lines.join("\n");
}

export function createSignInFeature(
  wallet: OkoSvmWalletInterface,
  config: WalletStandardConfig,
): Record<string, unknown> {
  const signIn = async (...inputs: SolanaSignInInput[]) => {
    const outputs = [];

    for (const input of inputs) {
      if (!wallet.connected || !wallet.publicKey) {
        await wallet.connect();
      }

      const publicKey = wallet.publicKey;
      if (!publicKey) {
        throw new Error("Wallet not connected");
      }

      const address = publicKey.toBase58();
      const message = buildSignInMessage(input, address);
      const messageBytes = new TextEncoder().encode(message);
      const signature = await wallet.signMessage(messageBytes);

      const accountFeatures = [
        config.features.signIn,
        config.features.signMessage,
        config.features.signTransaction,
        config.features.signAndSendTransaction,
      ];

      const account = new OkoSvmWalletAccount(
        address,
        publicKey.toBytes(),
        config.chains,
        accountFeatures,
      );

      outputs.push({
        account,
        signedMessage: messageBytes,
        signature,
        signatureType: "ed25519",
      });
    }

    return outputs;
  };

  return {
    [config.features.signIn]: {
      version: "1.0.0",
      signIn,
    },
  };
}
