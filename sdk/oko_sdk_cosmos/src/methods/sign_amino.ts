import type { AminoSignResponse, StdSignDoc } from "@cosmjs/amino";
import type { KeplrSignOptions } from "@keplr-wallet/types";
import type { MakeCosmosSigData } from "@oko-wallet/oko-sdk-core";

import type { OkoCosmosWalletInterface } from "@oko-wallet-sdk-cosmos/types";

export async function signAmino(
  this: OkoCosmosWalletInterface,
  chainId: string,
  signer: string,
  signDoc: StdSignDoc,
  signOptions?: KeplrSignOptions,
): Promise<AminoSignResponse> {
  try {
    const origin = this.okoWallet.origin;
    const chainInfoList = await this.getCosmosChainInfo();
    const chainInfo = chainInfoList.find((info) => info.chainId === chainId);

    if (!chainInfo) {
      throw new Error("Chain info not found for chainId: " + chainId);
    }

    const data: MakeCosmosSigData = {
      chain_type: "cosmos",
      sign_type: "tx",
      payload: {
        chain_info: {
          chain_id: chainId,
          rpc_url: chainInfo.rpc,
          rest_url: chainInfo.rest,
          chain_name: chainInfo?.chainName ?? "",
          chain_symbol_image_url: chainInfo?.stakeCurrency?.coinImageUrl ?? "",
          fee_currencies: chainInfo.feeCurrencies,
          currencies: chainInfo.currencies,

          bech32_config: chainInfo?.bech32Config,
          features: chainInfo?.features,
          bip44: chainInfo?.bip44,
          evm: chainInfo?.evm,
        },
        signDoc,
        signer,
        origin,
        signOptions,
      },
    };

    const openModalResp = await this.openModal(data);

    if (openModalResp.modal_type !== "cosmos/make_signature") {
      throw new Error("Invalid modal type response");
    }

    switch (openModalResp.type) {
      case "approve": {
        if (openModalResp.data.chain_type !== "cosmos") {
          throw new Error("Invalid chain type sig response");
        }

        const signature = openModalResp.data.sig_result.signature;
        const signed = openModalResp.data.sig_result.signed;

        if ("accountNumber" in signed) {
          throw new Error("Signed document is not in the correct format");
        }

        return {
          signed,
          signature,
        };
      }
      case "reject": {
        throw new Error("User rejected modal request");
      }
      case "error": {
        const message = `${openModalResp.error.type}`;

        throw new Error(message);
      }
      default: {
        throw new Error("unreachable");
      }
    }
  } catch (error) {
    console.error("[oko-cosmos] Error signing amino, err: %s", error);

    throw error;
  }
}
