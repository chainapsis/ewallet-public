import { makeSignDoc as makeProtoSignDoc } from "@cosmjs/proto-signing";
import { MsgSend } from "@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx";
import { PubKey } from "@keplr-wallet/proto-types/cosmos/crypto/secp256k1/keys";
import { SignMode } from "@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing";
import {
  AuthInfo,
  Fee,
  TxBody,
} from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import { CosmosIcon } from "@oko-wallet/oko-common-ui/icons/cosmos_icon";
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useCallback } from "react";

import { SignWidget } from "@oko-wallet-demo-web/components/widgets/sign_widget/sign_widget";
import { COSMOS_CHAIN_ID } from "@oko-wallet-demo-web/constants/cosmos";

const TOKEN_MINIMAL_DENOM = "uatom";

export const CosmosOnchainSignWidget = () => {
  const { cosmosWallet: okoCosmos } = useOkoCosmos();

  const handleClickCosmosSignDirect = useCallback(async () => {
    console.log("handleClickCosmosSignDirect()");

    if (okoCosmos === null) {
      throw new Error("okoCosmos is not initialized");
    }

    const account = await okoCosmos.getKey(COSMOS_CHAIN_ID);
    const address = account?.bech32Address;

    if (!address) {
      throw new Error("Address is not found");
    }

    const bodyBytes = TxBody.encode(
      // biome-ignore lint/complexity/noBannedTypes: required by protobuf fromPartial generic
      TxBody.fromPartial<{}>({
        messages: [
          {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: MsgSend.encode({
              fromAddress: address,
              toAddress: address,
              amount: [
                {
                  denom: TOKEN_MINIMAL_DENOM,
                  amount: "10",
                },
              ],
            }).finish(),
          },
        ],
        memo: "",
      }),
    ).finish();

    const authInfoBytes = AuthInfo.encode({
      signerInfos: [
        {
          publicKey: {
            typeUrl: "/cosmos.crypto.secp256k1.PubKey",
            value: PubKey.encode({
              key: account.pubKey,
            }).finish(),
          },
          modeInfo: {
            single: {
              mode: SignMode.SIGN_MODE_DIRECT,
            },
            multi: undefined,
          },
          sequence: "0",
        },
      ],
      // biome-ignore lint/complexity/noBannedTypes: required by protobuf fromPartial generic
      fee: Fee.fromPartial<{}>({
        amount: [
          {
            denom: TOKEN_MINIMAL_DENOM,
            amount: "1000",
          },
        ],
        gasLimit: "200000",
      }),
    }).finish();

    const mockSignDoc = makeProtoSignDoc(
      bodyBytes,
      authInfoBytes,
      COSMOS_CHAIN_ID,
      1288582,
    );

    const result = await okoCosmos.signDirect(
      COSMOS_CHAIN_ID,
      address,
      mockSignDoc,
    );
    console.info("SignDirect result:", result);
  }, [okoCosmos]);

  return (
    <SignWidget
      chain="Cosmos Hub"
      chainIcon={<CosmosIcon />}
      signType="onchain"
      signButtonOnClick={handleClickCosmosSignDirect}
    />
  );
};
