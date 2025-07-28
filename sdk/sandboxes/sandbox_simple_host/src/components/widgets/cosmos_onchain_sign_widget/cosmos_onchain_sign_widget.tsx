import React, { useCallback, useEffect, useState } from "react";
import { makeSignDoc as makeProtoSignDoc } from "@cosmjs/proto-signing";
import {
  AuthInfo,
  Fee,
  TxBody,
} from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import { MsgSend } from "@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx";
import { PubKey } from "@keplr-wallet/proto-types/cosmos/crypto/secp256k1/keys";
import { SignMode } from "@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing";
import {
  CosmosEWallet,
  initCosmosEWallet,
} from "@keplr-ewallet/ewallet-sdk-cosmos";
import { CosmosIcon } from "@keplr-ewallet/ewallet-common-ui/icons/cosmos_icon";

import { useKeplrEwallet } from "@keplr-ewallet-demo-web/contexts/KeplrEwalletProvider";
import { SignWidget } from "@keplr-ewallet-demo-web/components/widgets/sign_widget/sign_widget";
import Long from "long";

const COSMOS_CHAIN_ID = "cosmoshub-4";

export const CosmosOnchainSignWidget = () => {
  const { eWallet } = useKeplrEwallet();
  const [isLoading, setIsLoading] = useState(false);

  const [cosmosEWallet, setCosmosEWallet] = useState<CosmosEWallet | null>(
    null,
  );

  useEffect(() => {
    if (eWallet) {
      initCosmosEWallet({ eWallet }).then((res) => {
        setCosmosEWallet(res);
      });
    }
  }, [eWallet, setCosmosEWallet]);

  // const handleClickGetCosmosAccounts = async () => {
  //   const cosmosEWallet = await getCosmosEWallet({ eWallet });
  //   if (cosmosEWallet !== null) {
  //     try {
  //       const ret = await cosmosEWallet.getAccounts();
  //       console.log(22, ret);
  //     } catch (error) {
  //       console.error("Failed to get accounts:", error);
  //     }
  //   } else {
  //     console.error("CosmosEWallet is not initialized");
  //   }
  // };

  const handleClickCosmosSignDirect = useCallback(async () => {
    console.log("handleClickCosmosSignDirect()");

    if (cosmosEWallet !== null) {
      try {
        setIsLoading(true);
        const account = await cosmosEWallet.getKey(COSMOS_CHAIN_ID);
        const address = account?.bech32Address;
        console.log("account", account);

        if (!address) {
          throw new Error("Address is not found");
        }

        const bodyBytes = TxBody.encode(
          TxBody.fromPartial<{}>({
            messages: [
              {
                typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                value: MsgSend.encode({
                  fromAddress: address,
                  toAddress: address,
                  amount: [
                    {
                      denom: "uosmo",
                      amount: "10",
                    },
                  ],
                }),
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
          fee: Fee.fromPartial<{}>({
            amount: [
              {
                denom: "uosmo",
                amount: "1000",
              },
            ],
            gasLimit: "200000",
          }),
        }).finish();

        const mockSignDoc = makeProtoSignDoc(
          bodyBytes,
          authInfoBytes,
          "osmosis-1",
          1288582,
        );

        const compatibleSignDoc = {
          ...mockSignDoc,
          accountNumber: Long.fromBigInt(mockSignDoc.accountNumber),
        };

        const result = await cosmosEWallet.signDirect(
          COSMOS_CHAIN_ID,
          address,
          compatibleSignDoc,
        );
        console.log("SignDirect result:", result);
      } catch (error) {
        console.error("SignDirect failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [cosmosEWallet]);

  return (
    <SignWidget
      chain="Cosmos Hub"
      chainIcon={<CosmosIcon />}
      signType="onchain"
      isLoading={isLoading}
      signButtonOnClick={() => {
        handleClickCosmosSignDirect();
      }}
    />
  );
};
