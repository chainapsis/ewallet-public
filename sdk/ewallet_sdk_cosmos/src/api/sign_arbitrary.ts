import { sha256 } from "@noble/hashes/sha2";
import type { StdSignature, StdSignDoc } from "@cosmjs/amino";
import { serializeSignDoc } from "@cosmjs/amino";

import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";
import { encodeCosmosSignature } from "@keplr-ewallet-sdk-cosmos/utils/sign";
import { makeADR36AminoSignDoc } from "@keplr-ewallet-sdk-cosmos/utils/arbitrary";
import type { EWalletMsg } from "@keplr-ewallet/ewallet-sdk-core";

export async function signArbitrary(
  this: CosmosEWallet,
  chainId: string,
  signer: string,
  data: string | Uint8Array,
): Promise<StdSignature> {
  try {
    // Create ADR-36 sign doc for arbitrary message signing
    const signDoc = makeADR36AminoSignDoc(signer, data);
    const publicKey = await this.getPublicKey();
    const signDocHash = sha256(serializeSignDoc(signDoc));
    const origin = this.eWallet.origin;

    const chainInfoList = await this.getCosmosChainInfoList();
    const chainInfo = chainInfoList.find((info) => info.chainId === chainId);

    const showModalMsg: EWalletMsg = {
      msg_type: "show_modal",
      payload: {
        modal_type: "make_signature",
        data: {
          chain_type: "cosmos",
          sign_type: "arbitrary",
          payload: {
            chain_info: {
              chain_id: chainId,
              chain_name: chainInfo?.chainName ?? "",
              chain_symbol_image_url:
                chainInfo?.stakeCurrency?.coinImageUrl ?? "",
            },
            signer,
            data,
            signDoc,
            origin,
          },
        },
      },
    };
    const openModalAck = await this.eWallet.showModal(showModalMsg);

    if (openModalAck.msg_type !== "show_modal_ack") {
      await this.eWallet.hideModal();
      throw new Error("Can't receive show_modal_ack from ewallet");
    }

    await this.eWallet.hideModal();

    if (openModalAck.payload === "reject") {
      throw new Error("User rejected the signature request");
    }

    const makeSignatureAck = await this.eWallet.sendMsgToIframe({
      msg_type: "make_signature",
      payload: { msg: signDocHash },
    });

    if (makeSignatureAck.msg_type !== "make_signature_ack") {
      throw new Error("Can't receive make_signature_ack from ewallet");
    }

    const signature = encodeCosmosSignature(
      makeSignatureAck.payload.sign_output,
      publicKey,
    );

    const isVerified = await this.verifyArbitrary(
      chainId,
      signer,
      data,
      signature,
    );

    if (!isVerified) {
      throw new Error("Signature verification failed");
    }

    return {
      ...signature,
    };
  } catch (error) {
    console.error("[signArbitrary cosmos] [error] @@@@@", error);
    throw error;
  }
}
