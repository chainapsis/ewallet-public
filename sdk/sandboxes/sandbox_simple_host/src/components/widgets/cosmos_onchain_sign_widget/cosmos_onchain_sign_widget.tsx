import React, { useCallback, useState } from "react";
import { makeSignDoc as makeProtoSignDoc } from "@cosmjs/proto-signing";
import { makeSignDoc as makeAminoSignDoc } from "@cosmjs/amino";
import type {
  AminoSignResponse,
  DirectSignResponse,
} from "@keplr-wallet/types";
import {
  AuthInfo,
  Fee,
  TxBody,
} from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import { MsgSend } from "@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx";
import { PubKey } from "@keplr-wallet/proto-types/cosmos/crypto/secp256k1/keys";
import { SignMode } from "@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing";

import { useKeplrEwallet } from "@/contexts/KeplrEwalletProvider";
import { SignWidget } from "@/components/widgets/sign_widget/sign_widget";
import Long from "long";
import styles from "./cosmos_onchain_sign_widget.module.scss";

const COSMOS_CHAIN_ID = "cosmoshub-4";

export const CosmosOnchainSignWidget = () => {
  const { cosmosEWallet } = useKeplrEwallet();
  const [isLoading, setIsLoading] = useState(false);
  const [signType, setSignType] = useState<"animo" | "direct">("direct");
  const [result, setResult] = useState<
    AminoSignResponse | DirectSignResponse | null
  >(null);

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

        // const result = await cosmosEWallet.signDirect(
        //   COSMOS_CHAIN_ID,
        //   address,
        //   compatibleSignDoc,
        // );
        //
        // setResult(result);
        console.log("SignDirect result:", result);
      } catch (error) {
        console.error("SignDirect failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [cosmosEWallet]);

  const handleClickCosmosSignAnimo = useCallback(async () => {
    console.info("handleClickCosmosSignAnimo()");
    if (cosmosEWallet === null) {
      throw new Error("CosmosEWallet is not initialized");
    }

    const account = await cosmosEWallet.getKey(COSMOS_CHAIN_ID);
    const address = account?.bech32Address;

    if (!address) {
      throw new Error("Address is not found");
    }

    const stdFee = {
      amount: [
        {
          denom: "uosmo",
          amount: "1000",
        },
      ],
      gas: "200000",
    };
    const memo = "";
    const msgs = [
      {
        type: "/cosmos.bank.v1beta1.MsgSend",
        value: {
          fromAddress: address,
          toAddress: address,
          amount: [
            {
              denom: "uosmo",
              amount: "10",
            },
          ],
        },
      },
    ];
    const accountNumber = 1288582;
    const sequence = 0;

    const mockSignDoc = makeAminoSignDoc(
      msgs,
      stdFee,
      "osmosis-1",
      memo,
      accountNumber,
      sequence,
    );

    const result = await cosmosEWallet.signAmino(
      COSMOS_CHAIN_ID,
      address,
      mockSignDoc,
    );

    console.info("SignAmino result:", result);
  }, [cosmosEWallet]);

  return (
    <div className={styles.container}>
      <div className={styles.switch}>
        <button
          className={signType === "direct" ? styles.active : ""}
          onClick={() => setSignType("direct")}
        >
          Direct
        </button>
        <button
          className={signType === "animo" ? styles.active : ""}
          onClick={() => setSignType("animo")}
        >
          Animo
        </button>
      </div>
      <SignWidget
        chain="Cosmos Hub"
        signType="onchain"
        isLoading={isLoading}
        signButtonOnClick={
          signType === "direct"
            ? handleClickCosmosSignDirect
            : handleClickCosmosSignAnimo
        }
      />
      {result && (
        <div className={styles.resultContainer}>
          <div className={styles.resultItem}>{JSON.stringify(result)}</div>
          <button className={styles.sendTxButton}>Send Tx</button>
        </div>
      )}
    </div>
  );
};
