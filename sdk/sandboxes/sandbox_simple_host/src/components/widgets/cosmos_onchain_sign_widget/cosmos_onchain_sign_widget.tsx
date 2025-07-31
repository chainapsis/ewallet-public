import React, { useCallback, useState } from "react";
import { type DirectSignResponse } from "@cosmjs/proto-signing";
import { type AminoSignResponse } from "@cosmjs/amino";

import { TxRaw } from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";

import { useKeplrEwallet } from "@/contexts/KeplrEwalletProvider";
import { SignWidget } from "@/components/widgets/sign_widget/sign_widget";
import styles from "./cosmos_onchain_sign_widget.module.scss";
import {
  makeMockSendTokenAminoSignDoc,
  makeMockSendTokenProtoSignDoc,
} from "@/utils/cosmos";

const TEST_CHAIN_ID = "osmosis-1";
const TEST_OSMOSIS_CHAIN_REST = "https://osmosis-rest.publicnode.com";
const ENDPOINT = "/cosmos/tx/v1beta1/txs";

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
        const { mockSignDoc, address } =
          await makeMockSendTokenProtoSignDoc(cosmosEWallet);

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

    const { mockSignDoc, address } =
      await makeMockSendTokenAminoSignDoc(cosmosEWallet);

    const result = await cosmosEWallet.signAmino(
      TEST_CHAIN_ID,
      address,
      mockSignDoc,
    );

    setResult(result);
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
            <h3>Signature</h3>
            <p style={{ wordBreak: "break-all" }}>
              {result.signature.signature}
            </p>
            <h3>SignDoc</h3>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                maxHeight: "200px",
                overflow: "auto",
                wordBreak: "break-all",
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "#f5f5f5",
              }}
            >
              {JSON.stringify(result.signed, (_, v) =>
                typeof v === "bigint" ? v.toString() : v,
              )}
            </pre>
          </div>
          {/* Note: Show send button only when it is sign-direct.
             For amino requires some extra work to fetch, so we can test with Amino only in cosmJS, so I just pass
          */}
          {"bodyBytes" in result.signed && (
            <SendTxButton result={result} className={styles.sendTxButton} />
          )}
        </div>
      )}
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

    return null;
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
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <button className={className} onClick={onSendTx}>
        Send Tx
      </button>
    </div>
  );
};
