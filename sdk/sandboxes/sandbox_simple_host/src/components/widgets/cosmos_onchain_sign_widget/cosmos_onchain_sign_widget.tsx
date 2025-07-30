import React, { useCallback, useState } from "react";
import {
  makeSignDoc as makeProtoSignDoc,
  type DirectSignResponse,
} from "@cosmjs/proto-signing";
import {
  coin,
  makeSignDoc as makeAminoSignDoc,
  type AminoSignResponse,
} from "@cosmjs/amino";

import {
  AuthInfo,
  Fee,
  TxBody,
  TxRaw,
} from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import { MsgSend } from "@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx";
import { PubKey } from "@keplr-wallet/proto-types/cosmos/crypto/secp256k1/keys";
import { SignMode } from "@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing";

import { useKeplrEwallet } from "@/contexts/KeplrEwalletProvider";
import { SignWidget } from "@/components/widgets/sign_widget/sign_widget";
import styles from "./cosmos_onchain_sign_widget.module.scss";
import { SigningStargateClient } from "@cosmjs/stargate";

const TEST_CHAIN_ID = "osmosis-1";
const TEST_OSMOSIS_CHAIN_REST = "https://osmosis-rest.publicnode.com";
const TEST_ACCOUNT_NUMBER = 3482954;

export const CosmosOnchainSignWidget = () => {
  const { cosmosEWallet } = useKeplrEwallet();
  const [isLoading, setIsLoading] = useState(false);
  const [signType, setSignType] = useState<"animo" | "direct">("direct");
  const [result, setResult] = useState<
    AminoSignResponse | DirectSignResponse | null
  >(null);
  const [address, setAddress] = useState<string | null>(null);

  const handleClickCosmosSignDirect = useCallback(async () => {
    console.log("handleClickCosmosSignDirect()");

    if (cosmosEWallet !== null) {
      try {
        setIsLoading(true);
        const account = await cosmosEWallet.getKey(TEST_CHAIN_ID);
        const address = account?.bech32Address;
        setAddress(address);

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
          fee: Fee.fromPartial<{}>({
            amount: [
              {
                denom: "uosmo",
                amount: "1000",
              },
            ],
            gas: "200000",
            gasLimit: "200000",
            payer: address,
          }),
        }).finish();

        const mockSignDoc = makeProtoSignDoc(
          bodyBytes,
          authInfoBytes,
          TEST_CHAIN_ID,
          TEST_ACCOUNT_NUMBER,
        );

        const result = await cosmosEWallet.signDirect(
          TEST_CHAIN_ID,
          address,
          mockSignDoc,
        );

        setResult(result);
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

    const account = await cosmosEWallet.getKey(TEST_CHAIN_ID);
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
      TEST_CHAIN_ID,
      memo,
      accountNumber,
      sequence,
    );

    const result = await cosmosEWallet.signAmino(
      TEST_CHAIN_ID,
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
          <div className={styles.resultItem}>
            <p>Signature</p>
            <p>{result.signature.signature}</p>
            <p>SignDoc</p>
            <p>
              {JSON.stringify(result.signed, (_, v) =>
                typeof v === "bigint" ? v.toString() : v,
              )}
            </p>
          </div>
          {address && (
            <SendTokenTest address={address} amount="10" denom="uosmo" />
          )}
          <SendTxButton result={result} className={styles.sendTxButton} />
        </div>
      )}
    </div>
  );
};

const SendTokenTest = ({
  address,
  amount,
  denom,
}: {
  address: string;
  amount: string;
  denom: string;
}) => {
  const { cosmosEWallet } = useKeplrEwallet();
  const signer = cosmosEWallet?.getOfflineSigner(TEST_CHAIN_ID);
  if (!signer) {
    throw new Error("Signer is not found");
  }
  const sendToken = async () => {
    const client = await SigningStargateClient.connectWithSigner(
      TEST_OSMOSIS_CHAIN_REST,
      signer,
    );
    const res = await client.sendTokens(
      address,
      amount,
      [coin(amount, denom)],
      "auto",
    );
    console.log("res", res);
  };

  return (
    <div>
      <p>Address: {address}</p>
      <p>Amount: {amount}</p>
      <p>Denom: {denom}</p>
      <button onClick={sendToken}>Send Token</button>
    </div>
  );
};

const SendTxButton = ({
  result,
  className,
}: {
  result: DirectSignResponse | AminoSignResponse;
  className?: string;
}) => {
  const { cosmosEWallet } = useKeplrEwallet();
  const ENDPOINT = "/cosmos/tx/v1beta1/txs";

  const signer = cosmosEWallet?.getOfflineSigner(TEST_CHAIN_ID);
  if (!signer) {
    throw new Error("Signer is not found");
  }

  const encodeTx = (() => {
    const isSignDirect = "bodyBytes" in result.signed;
    const signature = result.signature.signature;

    if (isSignDirect) {
      const tx = TxRaw.encode({
        bodyBytes: result.signed.bodyBytes,
        authInfoBytes: result.signed.authInfoBytes,
        signatures: [Buffer.from(signature, "base64")],
      }).finish();
      return tx;
    }

    throw new Error("Not supported");
  })();

  const onSendTx = async () => {
    const res = await fetch(TEST_OSMOSIS_CHAIN_REST + ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        tx_bytes: Buffer.from(encodeTx as any).toString("base64"),
        mode: "BROADCAST_MODE_SYNC",
      }),
    });

    const data = await res.json();
    console.log("result", data);
  };

  return (
    <button className={className} onClick={onSendTx}>
      Send Tx
    </button>
  );
};
