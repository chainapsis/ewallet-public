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

    const msg: EWalletMsg = {
      msg_type: "show_modal",
      payload: {
        modal_type: "make_signature",
        is_demo: true,
        data: {
          chain_type: "cosmos",
          sign_type: "arbitrary",
          payload: {
            chain_info: {
              chain_id: chainId,
              chain_name: "cosmos",
              chain_symbol_image_url:
                "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/cosmoshub/uatom.png",
            },
            signer,
            data,
            signDoc,
            origin,
          },
        },
      },
    };
    const openModalAck = await this.eWallet.showModal(msg);
    if (openModalAck.msg_type === "show_modal_ack") {
      await this.eWallet.hideModal();

      if (openModalAck.payload === "approve") {
        const res = await this.eWallet.sendMsgToIframe({
          msg_type: "make_signature",
          payload: {
            msg: signDocHash,
          },
        });
        const signature = encodeCosmosSignature(
          res.payload.sign_output,
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
      }

      if (openModalAck.payload === "reject") {
        throw new Error("User rejected the signature request");
      }
    }

    throw new Error("Can't receive show_modal_ack from ewallet");
  } catch (error) {
    console.error("[signArbitrary cosmos] [error] @@@@@", error);
    throw error;
  }
}
