import type {
  OkoWalletMsgOpenModal,
  MakeSvmSigData,
} from "@oko-wallet/oko-sdk-core";
import type { PublicKey } from "@solana/web3.js";
import { v4 as uuidv4 } from "uuid";

import type { OkoSvmWalletInterface } from "@oko-wallet-sdk-svm/types";
import type {
  SvmSignParams,
  SvmSignResult,
} from "@oko-wallet-sdk-svm/types/sign";

export class SolanaRpcError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "SolanaRpcError";
  }
}

export const SolanaRpcErrorCode = {
  UserRejectedRequest: 4001,
  Internal: -32603,
} as const;

export async function makeSignature(
  this: OkoSvmWalletInterface,
  params: SvmSignParams,
): Promise<SvmSignResult> {
  await this.waitUntilInitialized;

  const origin = this.okoWallet.origin;

  if (!this.publicKey) {
    throw new SolanaRpcError(
      SolanaRpcErrorCode.Internal,
      "Wallet not connected",
    );
  }

  const signer = this.publicKey.toBase58();
  const chainId = this.state.chainId;

  const makeSignatureData = createMakeSignatureData(
    origin,
    signer,
    chainId,
    params,
  );

  const signResult = await handleSigningFlow(this, makeSignatureData, params);

  return signResult;
}

function createMakeSignatureData(
  origin: string,
  signer: string,
  chainId: string,
  params: SvmSignParams,
): MakeSvmSigData {
  switch (params.type) {
    case "sign_transaction": {
      const tx = params.transaction;
      const isVersioned = "version" in tx;

      // Serialize full transaction for display/later use
      const serialized = Buffer.from(
        tx.serialize({ requireAllSignatures: false }),
      ).toString("base64");

      // Serialize just the message bytes for signing
      // This is what ed25519 actually signs
      const messageBytes = isVersioned
        ? tx.message.serialize()
        : tx.serializeMessage();
      const messageBase64 = Buffer.from(messageBytes).toString("base64");

      return {
        chain_type: "svm",
        sign_type: "tx",
        payload: {
          origin,
          signer,
          chain_id: chainId,
          data: {
            serialized_transaction: serialized,
            message_to_sign: messageBase64,
            is_versioned: isVersioned,
          },
        },
      };
    }

    case "sign_all_transactions": {
      if (params.transactions.length === 0) {
        throw new Error("No transactions to sign");
      }

      const hasVersioned = params.transactions.some((tx) => "version" in tx);
      const hasLegacy = params.transactions.some((tx) => !("version" in tx));

      if (hasVersioned && hasLegacy) {
        throw new Error("Cannot mix legacy and versioned transactions");
      }

      const isVersioned = hasVersioned;

      const serializedTxs = params.transactions.map((tx) =>
        Buffer.from(tx.serialize({ requireAllSignatures: false })).toString(
          "base64",
        ),
      );

      const messagesToSign = params.transactions.map((tx) => {
        const messageBytes =
          "version" in tx ? tx.message.serialize() : tx.serializeMessage();
        return Buffer.from(messageBytes).toString("base64");
      });

      return {
        chain_type: "svm",
        sign_type: "all_tx",
        payload: {
          origin,
          signer,
          chain_id: chainId,
          data: {
            serialized_transactions: serializedTxs,
            messages_to_sign: messagesToSign,
            is_versioned: isVersioned,
          },
        },
      };
    }

    case "sign_message": {
      return {
        chain_type: "svm",
        sign_type: "message",
        payload: {
          origin,
          signer,
          chain_id: chainId,
          data: {
            message: Buffer.from(params.message).toString("hex"),
          },
        },
      };
    }
  }
}

async function handleSigningFlow(
  okoSvmWallet: OkoSvmWalletInterface,
  data: MakeSvmSigData,
  params: SvmSignParams,
): Promise<SvmSignResult> {
  const okoWallet = okoSvmWallet.okoWallet;

  try {
    const modal_id = uuidv4();

    const openModalMsg: OkoWalletMsgOpenModal = {
      target: "oko_attached",
      msg_type: "open_modal",
      payload: {
        modal_type: "svm/make_signature",
        modal_id,
        data,
      },
    };

    const openModalResp = await okoWallet.openModal(openModalMsg);

    if (!openModalResp.success) {
      throw new Error(
        `Error getting open modal response: ${openModalResp.err}`,
      );
    }

    const ackPayload = openModalResp.data;

    if (ackPayload.modal_type !== "svm/make_signature") {
      throw new Error("Invalid modal type response");
    }

    switch (ackPayload.type) {
      case "approve": {
        if (ackPayload.data.chain_type !== "svm") {
          throw new Error("Invalid chain type sig response");
        }

        const sigResult = ackPayload.data.sig_result;

        return convertSigResultToOutput(
          sigResult,
          params,
          okoSvmWallet.publicKey!,
        );
      }

      case "reject": {
        throw new SolanaRpcError(
          SolanaRpcErrorCode.UserRejectedRequest,
          "User rejected the signature request",
        );
      }

      case "error": {
        const message = `${ackPayload.error.type}`;
        throw new Error(message);
      }

      default: {
        throw new Error("unreachable response type");
      }
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      throw error;
    }

    let message = "unknown empty error";
    if (error instanceof Error) {
      if (error.message && error.message.length > 0) {
        message = error.message;
      }
    } else {
      message = String(error);
    }

    throw new SolanaRpcError(SolanaRpcErrorCode.Internal, message);
  } finally {
    okoWallet.closeModal();
  }
}

function convertSigResultToOutput(
  sigResult:
    | { type: "signature"; signature: string }
    | { type: "signatures"; signatures: string[] },
  params: SvmSignParams,
  publicKey: PublicKey,
): SvmSignResult {
  switch (params.type) {
    case "sign_transaction": {
      const signatureHex = (
        sigResult as { type: "signature"; signature: string }
      ).signature;
      const signatureBytes = Buffer.from(signatureHex, "hex");

      // Add signature to transaction
      const tx = params.transaction;

      // Check if it's a versioned transaction or legacy transaction
      if ("version" in tx) {
        // VersionedTransaction - signatures are stored differently
        // For versioned transactions, we need to set the signature in the signatures array
        const signerIndex = tx.message.staticAccountKeys.findIndex((key) =>
          key.equals(publicKey),
        );
        if (signerIndex !== -1) {
          tx.signatures[signerIndex] = signatureBytes;
        }
      } else {
        // Legacy Transaction - use addSignature method
        tx.addSignature(publicKey, signatureBytes);
      }

      return {
        type: "sign_transaction",
        signedTransaction: tx,
      };
    }

    case "sign_all_transactions": {
      const signatures = (
        sigResult as { type: "signatures"; signatures: string[] }
      ).signatures;

      const signedTransactions = params.transactions.map((tx, index) => {
        const signatureHex = signatures[index];
        const signatureBytes = Buffer.from(signatureHex, "hex");

        if ("version" in tx) {
          const signerIndex = tx.message.staticAccountKeys.findIndex((key) =>
            key.equals(publicKey),
          );
          if (signerIndex !== -1) {
            tx.signatures[signerIndex] = signatureBytes;
          }
        } else {
          tx.addSignature(publicKey, signatureBytes);
        }

        return tx;
      });

      return {
        type: "sign_all_transactions",
        signedTransactions,
      };
    }

    case "sign_message": {
      const signatureHex = (
        sigResult as { type: "signature"; signature: string }
      ).signature;
      const signatureBytes = new Uint8Array(Buffer.from(signatureHex, "hex"));

      return {
        type: "sign_message",
        signature: signatureBytes,
      };
    }
  }
}
