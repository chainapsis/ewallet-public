import { sha256 } from "@noble/hashes/sha2";
import type { KeplrSignOptions } from "@keplr-wallet/types";
import { SignDocWrapper } from "@keplr-wallet/cosmos";
import type { MakeCosmosSigData } from "@keplr-ewallet/ewallet-sdk-core";

import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";
import { encodeCosmosSignature } from "@keplr-ewallet-sdk-cosmos/utils/sign";
import { makeSignBytes, type DirectSignResponse } from "@cosmjs/proto-signing";
import type { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";

export async function signDirect(
  this: CosmosEWallet,
  chainId: string,
  signer: string,
  signDoc: SignDoc,
  signOptions?: KeplrSignOptions,
): Promise<DirectSignResponse> {
  try {
    const origin = this.eWallet.origin;

    const signBytes = makeSignBytes(signDoc);
    const hashedMessage = sha256(signBytes);
    const publicKey = await this.getPublicKey();

    const signDocWrapper = SignDocWrapper.fromDirectSignDoc({
      ...signDoc,
      accountNumber: signDoc.accountNumber.toString(),
    });

    const chainInfoList = await this.getCosmosChainInfo();
    const chainInfo = chainInfoList.find((info) => info.chainId === chainId);

    const showModalData: MakeCosmosSigData = {
      chain_type: "cosmos",
      sign_type: "tx",
      payload: {
        chain_info: {
          chain_id: chainId,
          chain_name: chainInfo?.chainName ?? "",
          chain_symbol_image_url: chainInfo?.stakeCurrency?.coinImageUrl ?? "",
        },
        signer,
        msgs: signDocWrapper.protoSignDoc.txMsgs,
        signDocString: JSON.stringify(
          signDocWrapper.protoSignDoc.toJSON(),
          null,
          2,
        ),
        origin,
      },
    };
    const showModalResponse = await this.showModal(showModalData);

    if (showModalResponse === "reject") {
      throw new Error("User rejected the signature request");
    }

    const makeSignatureAck = await this.makeSignature(hashedMessage);

    const signature = encodeCosmosSignature(
      makeSignatureAck.sign_output,
      publicKey,
    );

    return {
      signed: signDoc,
      signature,
    };
  } catch (error) {
    console.error("[signDirect cosmos] [error] @@@@@", error);
    throw error;
  }
}
