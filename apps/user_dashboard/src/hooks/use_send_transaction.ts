"use client";

import type { StdFee, StdSignDoc } from "@cosmjs/amino";
import { MsgSend } from "@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx";
import { PubKey } from "@keplr-wallet/proto-types/cosmos/crypto/secp256k1/keys";
import { SignMode } from "@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing";
import {
  AuthInfo,
  Fee,
  TxBody,
  TxRaw,
} from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import { MsgExecuteContract } from "@keplr-wallet/proto-types/cosmwasm/wasm/v1/tx";
import { Dec } from "@keplr-wallet/unit";
import {
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey as SolPublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useCallback } from "react";

import { getTokenType } from "@oko-wallet-user-dashboard/components/send_modal/types";
import {
  selectCosmosSDK,
  selectEthSDK,
  selectSolSDK,
  useSDKState,
} from "@oko-wallet-user-dashboard/state/sdk";
import type { TokenBalance } from "@oko-wallet-user-dashboard/types/token";
import {
  getErc20ContractAddress,
  getSplMintAddress,
  humanToRawAmount,
} from "@oko-wallet-user-dashboard/utils/send";

type Hex = `0x${string}`;

function encodeErc20Transfer(to: string, amount: string): Hex {
  const addressPadded = to.slice(2).toLowerCase().padStart(64, "0");
  const amountHex = BigInt(amount).toString(16).padStart(64, "0");
  return `0xa9059cbb${addressPadded}${amountHex}` as Hex;
}

function makeAminoMsgSend(
  from: string,
  to: string,
  denom: string,
  amount: string,
) {
  return {
    type: "cosmos-sdk/MsgSend",
    value: {
      from_address: from,
      to_address: to,
      amount: [{ denom, amount }],
    },
  };
}

function makeAminoCw20Transfer(
  sender: string,
  contractAddress: string,
  recipient: string,
  amount: string,
) {
  return {
    type: "wasm/MsgExecuteContract",
    value: {
      sender,
      contract: contractAddress,
      msg: {
        transfer: {
          recipient,
          amount,
        },
      },
      funds: [],
    },
  };
}

export function useSendTransaction() {
  const okoEth = useSDKState(selectEthSDK);
  const okoCosmos = useSDKState(selectCosmosSDK);
  const okoSvm = useSDKState(selectSolSDK);

  const sendEvmTransaction = useCallback(
    async (
      tokenBalance: TokenBalance,
      recipientAddress: string,
      amountRaw: string,
      senderAddress: string,
    ): Promise<string> => {
      if (!okoEth) {
        throw new Error("ETH SDK not initialized");
      }

      const chainInfo = tokenBalance.chainInfo;
      if (!chainInfo.evm) {
        throw new Error("Not an EVM chain");
      }

      const provider = await okoEth.getEthereumProvider();
      await okoEth.switchChain(chainInfo.evm.chainId);

      const tokenType = getTokenType(tokenBalance.token.currency, chainInfo);

      if (tokenType === "erc20") {
        const contractAddress = getErc20ContractAddress(
          tokenBalance.token.currency.coinMinimalDenom,
        );
        const data = encodeErc20Transfer(recipientAddress, amountRaw);
        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: senderAddress as Hex,
              to: contractAddress as Hex,
              data,
            },
          ],
        });
        return txHash as string;
      }

      // Native transfer
      const valueHex = `0x${BigInt(amountRaw).toString(16)}` as Hex;
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: senderAddress as Hex,
            to: recipientAddress as Hex,
            value: valueHex,
          },
        ],
      });
      return txHash as string;
    },
    [okoEth],
  );

  const sendCosmosTransaction = useCallback(
    async (
      tokenBalance: TokenBalance,
      recipientAddress: string,
      amountRaw: string,
      senderAddress: string,
      feeRaw: string | null,
    ): Promise<string> => {
      if (!okoCosmos) {
        throw new Error("Cosmos SDK not initialized");
      }

      const chainInfo = tokenBalance.chainInfo;
      if (!chainInfo.cosmos) {
        throw new Error("Not a Cosmos chain");
      }

      const chainId = chainInfo.cosmos.chainId;
      const tokenType = getTokenType(tokenBalance.token.currency, chainInfo);

      const feeCurrency = chainInfo.cosmos.feeCurrencies[0];
      if (!feeCurrency) {
        throw new Error("No fee currency found");
      }

      const gasPrice = new Dec(feeCurrency.gasPriceStep?.average ?? 0.025);
      const gasLimit = tokenType === "cw20" ? 300000 : 200000;
      const feeAmount =
        feeRaw ?? gasPrice.mul(new Dec(gasLimit)).roundUp().toString();

      const fee: StdFee = {
        amount: [
          {
            denom: feeCurrency.coinMinimalDenom,
            amount: feeAmount,
          },
        ],
        gas: gasLimit.toString(),
      };

      let msg:
        | ReturnType<typeof makeAminoMsgSend>
        | ReturnType<typeof makeAminoCw20Transfer>;
      if (tokenType === "cw20") {
        msg = makeAminoCw20Transfer(
          senderAddress,
          tokenBalance.token.currency.coinMinimalDenom,
          recipientAddress,
          amountRaw,
        );
      } else {
        msg = makeAminoMsgSend(
          senderAddress,
          recipientAddress,
          tokenBalance.token.currency.coinMinimalDenom,
          amountRaw,
        );
      }

      // Get account info for sequence/account_number
      const accountRes = await fetch(
        `${chainInfo.cosmos.rest}/cosmos/auth/v1beta1/accounts/${senderAddress}`,
      );
      const accountData = await accountRes.json();
      const account =
        accountData.account?.base_account ?? accountData.account ?? {};
      const accountNumber = account.account_number ?? "0";
      const sequence = account.sequence ?? "0";

      const signDoc: StdSignDoc = {
        chain_id: chainId,
        account_number: accountNumber,
        sequence,
        fee,
        msgs: [msg],
        memo: "",
      };

      const signResponse = await okoCosmos.signAmino(
        chainId,
        senderAddress,
        signDoc,
      );

      // Serialize amino signed tx for broadcasting
      const txBytes = makeAminoTxBytes(
        signResponse.signed,
        signResponse.signature,
      );
      const txHash = await okoCosmos.sendTx(chainId, txBytes, "sync");

      return Buffer.from(txHash).toString("hex").toUpperCase();
    },
    [okoCosmos],
  );

  const sendSvmTransaction = useCallback(
    async (
      tokenBalance: TokenBalance,
      recipientAddress: string,
      amountRaw: string,
      senderAddress: string,
    ): Promise<string> => {
      if (!okoSvm) {
        throw new Error("SVM SDK not initialized");
      }

      const chainInfo = tokenBalance.chainInfo;
      if (!chainInfo.svm) {
        throw new Error("Not an SVM chain");
      }

      const connection = new Connection(chainInfo.svm.rpc);
      const fromPubkey = new SolPublicKey(senderAddress);
      const toPubkey = new SolPublicKey(recipientAddress);
      const tokenType = getTokenType(tokenBalance.token.currency, chainInfo);

      const transaction = new Transaction();

      if (tokenType === "spl") {
        const mintAddress = getSplMintAddress(
          tokenBalance.token.currency.coinMinimalDenom,
        );
        const mint = new SolPublicKey(mintAddress);
        const sourceAta = getAssociatedTokenAddressSync(mint, fromPubkey);
        const destAta = getAssociatedTokenAddressSync(mint, toPubkey);

        // Check if destination ATA exists, create if not
        const destAccountInfo = await connection.getAccountInfo(destAta);
        if (!destAccountInfo) {
          const { createAssociatedTokenAccountInstruction } = await import(
            "@solana/spl-token"
          );
          transaction.add(
            createAssociatedTokenAccountInstruction(
              fromPubkey,
              destAta,
              toPubkey,
              mint,
            ),
          );
        }

        transaction.add(
          createTransferInstruction(
            sourceAta,
            destAta,
            fromPubkey,
            BigInt(amountRaw),
          ),
        );
      } else {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: BigInt(amountRaw),
          }),
        );
      }

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const { signature } = await okoSvm.signAndSendTransaction(
        transaction,
        connection,
      );
      return signature;
    },
    [okoSvm],
  );

  const send = useCallback(
    async (
      tokenBalance: TokenBalance,
      recipientAddress: string,
      amount: string,
      senderAddress: string,
      feeRaw: string | null,
    ): Promise<string> => {
      const chainInfo = tokenBalance.chainInfo;
      const amountRaw = humanToRawAmount(
        amount,
        tokenBalance.token.currency.coinDecimals,
      );

      if (chainInfo.evm && !chainInfo.cosmos) {
        return sendEvmTransaction(
          tokenBalance,
          recipientAddress,
          amountRaw,
          senderAddress,
        );
      }

      if (chainInfo.cosmos) {
        return sendCosmosTransaction(
          tokenBalance,
          recipientAddress,
          amountRaw,
          senderAddress,
          feeRaw,
        );
      }

      if (chainInfo.svm) {
        return sendSvmTransaction(
          tokenBalance,
          recipientAddress,
          amountRaw,
          senderAddress,
        );
      }

      throw new Error("Unsupported chain type");
    },
    [sendEvmTransaction, sendCosmosTransaction, sendSvmTransaction],
  );

  return { send };
}

/**
 * Build proto-encoded Any message for TxBody from an amino msg.
 */
function aminoMsgToProtoAny(msg: {
  type: string;
  value: Record<string, unknown>;
}): { typeUrl: string; value: Uint8Array } {
  if (
    msg.type === "cosmos-sdk/MsgSend" ||
    msg.type === "/cosmos.bank.v1beta1.MsgSend"
  ) {
    const v = msg.value as {
      from_address: string;
      to_address: string;
      amount: { denom: string; amount: string }[];
    };
    return {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: MsgSend.encode({
        fromAddress: v.from_address,
        toAddress: v.to_address,
        amount: v.amount,
      }).finish(),
    };
  }

  if (
    msg.type === "wasm/MsgExecuteContract" ||
    msg.type === "/cosmwasm.wasm.v1.MsgExecuteContract"
  ) {
    const v = msg.value as {
      sender: string;
      contract: string;
      msg: Record<string, unknown>;
      funds: { denom: string; amount: string }[];
    };
    return {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.encode({
        sender: v.sender,
        contract: v.contract,
        msg: new TextEncoder().encode(JSON.stringify(v.msg)),
        funds: v.funds,
      }).finish(),
    };
  }

  throw new Error(`Unsupported amino msg type: ${msg.type}`);
}

/**
 * Serialize an amino-signed tx into proto TxRaw bytes for broadcasting.
 * Follows the Keplr pattern: amino signing + proto TxRaw serialization.
 */
function makeAminoTxBytes(
  signDoc: StdSignDoc,
  signature: { pub_key: { type: string; value: string }; signature: string },
): Uint8Array {
  // Convert amino messages to proto Any messages for TxBody
  const protoMsgs = signDoc.msgs.map((msg) =>
    aminoMsgToProtoAny(msg as { type: string; value: Record<string, unknown> }),
  );

  const bodyBytes = TxBody.encode(
    TxBody.fromPartial({
      messages: protoMsgs,
      memo: signDoc.memo,
    }),
  ).finish();

  // Decode the public key from base64
  const pubKeyBytes = Uint8Array.from(atob(signature.pub_key.value), (c) =>
    c.charCodeAt(0),
  );

  const authInfoBytes = AuthInfo.encode({
    signerInfos: [
      {
        publicKey: {
          typeUrl: "/cosmos.crypto.secp256k1.PubKey",
          value: PubKey.encode({
            key: pubKeyBytes,
          }).finish(),
        },
        modeInfo: {
          single: {
            mode: SignMode.SIGN_MODE_LEGACY_AMINO_JSON,
          },
          multi: undefined,
        },
        sequence: signDoc.sequence,
      },
    ],
    fee: Fee.fromPartial({
      amount: [...signDoc.fee.amount],
      gasLimit: signDoc.fee.gas,
    }),
  }).finish();

  // Decode the signature from base64
  const signatureBytes = Uint8Array.from(atob(signature.signature), (c) =>
    c.charCodeAt(0),
  );

  return TxRaw.encode({
    bodyBytes,
    authInfoBytes,
    signatures: [signatureBytes],
  }).finish();
}
