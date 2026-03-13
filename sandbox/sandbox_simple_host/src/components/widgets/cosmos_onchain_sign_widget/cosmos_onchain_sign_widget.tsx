import type { AminoSignResponse } from "@cosmjs/amino";
import type { DirectSignResponse } from "@cosmjs/proto-signing";
import { TxRaw } from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { SignWidget } from "@/components/widgets/sign_widget/sign_widget";
import {
  TEST_COSMOS_CHAIN_ENDPOINT,
  TEST_COSMOS_CHAIN_ID,
  TEST_COSMOS_CHAIN_REST,
} from "@/constants";
import { useOko } from "@/hooks/use_oko";
import {
  makeMockSendTokenAminoSignDoc,
  makeMockSendTokenProtoSignDoc,
} from "@/utils/cosmos";
import styles from "./cosmos_onchain_sign_widget.module.scss";

export const CosmosOnchainSignWidget = () => {
  const { okoCosmos } = useOko();
  const [signType, setSignType] = useState<"amino" | "direct">("direct");

  const directSignMutation = useMutation({
    mutationFn: async () => {
      console.log("handleClickCosmosSignDirect()");

      if (okoCosmos === null) {
        throw new Error("okoCosmos is not initialized");
      }

      const { mockSignDoc, address } =
        await makeMockSendTokenProtoSignDoc(okoCosmos);

      const result = await okoCosmos.signDirect(
        TEST_COSMOS_CHAIN_ID,
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
      console.log("handleClickCosmosSignAmino()");

      if (okoCosmos === null) {
        throw new Error("okoCosmos is not initialized");
      }

      const { mockSignDoc, address } =
        await makeMockSendTokenAminoSignDoc(okoCosmos);

      const result = await okoCosmos.signAmino(
        TEST_COSMOS_CHAIN_ID,
        address,
        mockSignDoc,
      );

      console.log("SignAmino result:", result);
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
          type="button"
          className={signType === "direct" ? styles.active : ""}
          onClick={() => setSignType("direct")}
        >
          Direct
        </button>
        <button
          type="button"
          className={signType === "amino" ? styles.active : ""}
          onClick={() => setSignType("amino")}
        >
          Amino
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
  const { okoCosmos } = useOko();

  const signer = okoCosmos?.getOfflineSigner(TEST_COSMOS_CHAIN_ID);
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
      const res = await fetch(
        TEST_COSMOS_CHAIN_REST + TEST_COSMOS_CHAIN_ENDPOINT,
        {
          method: "POST",
          body: JSON.stringify({
            tx_bytes: Buffer.from(encodeTx as any).toString("base64"),
            mode: "BROADCAST_MODE_SYNC",
          }),
        },
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.tx_response.code !== 0) {
        throw new Error(data.tx_response.raw_log);
      }

      return data.tx_response.txhash;
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
        type="button"
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
          Transaction sent successfully! TxHash: {sendTxMutation.data}
        </div>
      )}
    </div>
  );
};
