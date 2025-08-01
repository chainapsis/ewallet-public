import React, { useState } from "react";
import { type DirectSignResponse } from "@cosmjs/proto-signing";
import { type AminoSignResponse } from "@cosmjs/amino";
import { useMutation } from "@tanstack/react-query";

import { TxRaw } from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";

import { SignWidget } from "@/components/widgets/sign_widget/sign_widget";
import styles from "./cosmos_onchain_sign_widget.module.scss";
import {
  makeMockSendTokenAminoSignDoc,
  makeMockSendTokenProtoSignDoc,
} from "@/utils/cosmos";
import { useKeplrEwallet } from "@/components/keplr_ewallet_provider/use_keplr_ewallet";

const TEST_CHAIN_ID = "osmosis-1";
const TEST_OSMOSIS_CHAIN_REST = "https://osmosis-rest.publicnode.com";
const ENDPOINT = "/cosmos/tx/v1beta1/txs";

export const CosmosOnchainSignWidget = () => {
  const { cosmosEWallet } = useKeplrEwallet();
  const [signType, setSignType] = useState<"animo" | "direct">("direct");

  const directSignMutation = useMutation({
    mutationFn: async () => {
      console.log("handleClickCosmosSignDirect()");

      if (cosmosEWallet === null) {
        throw new Error("CosmosEWallet is not initialized");
      }

      const { mockSignDoc, address } =
        await makeMockSendTokenProtoSignDoc(cosmosEWallet);

      const result = await cosmosEWallet.signDirect(
        TEST_CHAIN_ID,
        address,
        mockSignDoc,
      );

      console.log("SignDirect result:", result);
      return result;
    },
    onError: (error) => {
      console.error("SignDirect failed:", error);
    },
  });

  const aminoSignMutation = useMutation({
    mutationFn: async () => {
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

      console.info("SignAmino result:", result);
      return result;
    },
    onError: (error) => {
      console.error("SignAmino failed:", error);
    },
  });

  const currentMutation =
    signType === "direct" ? directSignMutation : aminoSignMutation;
  const isLoading = currentMutation.isPending;
  const result = currentMutation.data;

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
        signButtonOnClick={() => currentMutation.mutate()}
      />

      {(directSignMutation.error || aminoSignMutation.error) && (
        <div className={styles.error}>
          {directSignMutation.error?.message ||
            aminoSignMutation.error?.message}
        </div>
      )}

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

  const sendTxMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(TEST_OSMOSIS_CHAIN_REST + ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          tx_bytes: Buffer.from(encodeTx as any).toString("base64"),
          mode: "BROADCAST_MODE_SYNC",
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.code !== 0) {
        throw new Error(data.tx_response.raw_log);
      }

      return data;
    },
    onError: (error) => {
      console.error("Send tx failed:", error);
    },
    onSuccess: (data) => {
      console.log("Transaction sent successfully:", data);
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <button
        className={className}
        onClick={() => sendTxMutation.mutate()}
        disabled={sendTxMutation.isPending}
      >
        {sendTxMutation.isPending ? "Sending..." : "Send Tx"}
      </button>
      {sendTxMutation.error && (
        <div style={{ color: "red", fontSize: "12px" }}>
          Error: {sendTxMutation.error.message}
        </div>
      )}
      {sendTxMutation.isSuccess && (
        <div style={{ color: "green", fontSize: "12px" }}>
          Transaction sent successfully!
        </div>
      )}
    </div>
  );
};
