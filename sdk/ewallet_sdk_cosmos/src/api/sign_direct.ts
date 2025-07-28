import { sha256 } from "@noble/hashes/sha2";
import { SignDoc as ProtoSignDoc } from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import type {
  DirectSignResponse,
  KeplrSignOptions,
  SignDoc,
} from "@keplr-wallet/types";
import { SignDocWrapper } from "@keplr-wallet/cosmos";

import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";
import { encodeCosmosSignature } from "@keplr-ewallet-sdk-cosmos/utils/sign";
import type { EWalletMsg } from "@keplr-ewallet-sdk-core/types";

export async function signDirect(
  this: CosmosEWallet,
  chainId: string,
  signer: string,
  signDoc: SignDoc,
  signOptions?: KeplrSignOptions,
): Promise<DirectSignResponse> {
  try {
    const compatibleSignDoc = {
      ...signDoc,
      accountNumber: signDoc.accountNumber.toString(),
    };
    const signBytes = ProtoSignDoc.encode(compatibleSignDoc).finish();
    const signDocHash = sha256(signBytes);
    const publicKey = await this.getPublicKey();
    const origin = this.eWallet.origin;
    console.log("signDirect @@@@@", signDoc, origin);

    const signDocWrapper = SignDocWrapper.fromDirectSignDoc({
      ...signDoc,
      accountNumber: signDoc.accountNumber.toString(),
    });

    const msg: EWalletMsg = {
      msg_type: "show_modal",
      payload: {
        modal_type: "make_signature",
        is_demo: true,
        data: {
          chain_type: "cosmos",
          sign_type: "tx",
          payload: {
            chain_info: {
              chain_id: chainId,
              chain_name: "cosmos",
              chain_symbol_image_url:
                "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/cosmoshub/uatom.png",
            },
            signer,
            msgs: [],
            signDocString: JSON.stringify(
              signDocWrapper.protoSignDoc.toJSON(),
              null,
              2,
            ),
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
        return {
          signed: signDoc,
          signature,
        };
      }

      if (openModalAck.payload === "reject") {
        throw new Error("User rejected the signature request");
      }
    }

    throw new Error("Unreachable");
  } catch (error) {
    console.error("[signDirect cosmos] [error] @@@@@", error);
    throw error;
  }
}
