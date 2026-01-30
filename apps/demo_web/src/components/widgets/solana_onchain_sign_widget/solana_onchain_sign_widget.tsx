import { useCallback, useState } from "react";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { SolanaIcon } from "@oko-wallet/oko-common-ui/icons/solana_icon";
import { Checkbox } from "@oko-wallet/oko-common-ui/checkbox";

import styles from "./solana_onchain_sign_widget.module.scss";
import { SignWidget } from "@oko-wallet-demo-web/components/widgets/sign_widget/sign_widget";
import { useSDKState } from "@oko-wallet-demo-web/state/sdk";

const SOLANA_RPC_URL = "https://api.devnet.solana.com";

export const SolanaOnchainSignWidget = () => {
  const okoSvm = useSDKState((state) => state.oko_svm);
  const [isLegacy, setIsLegacy] = useState(false);

  const handleClickSolOnchainSignV0 = useCallback(async () => {
    if (okoSvm === null) {
      throw new Error("okoSvm is not initialized");
    }

    if (!okoSvm.connected) {
      await okoSvm.connect();
    }

    if (!okoSvm.publicKey) {
      throw new Error("No public key available");
    }

    const connection = new Connection(SOLANA_RPC_URL);

    const toAddress = new PublicKey("11111111111111111111111111111111");

    const { blockhash } = await connection.getLatestBlockhash();

    const instructions = [
      SystemProgram.transfer({
        fromPubkey: okoSvm.publicKey,
        toPubkey: toAddress,
        lamports: 0.001 * LAMPORTS_PER_SOL,
      }),
    ];

    const messageV0 = new TransactionMessage({
      payerKey: okoSvm.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const versionedTransaction = new VersionedTransaction(messageV0);

    const signedTransaction =
      await okoSvm.signTransaction(versionedTransaction);

    console.log(
      "Solana v0 signed transaction:",
      Buffer.from(signedTransaction.signatures[0]).toString("hex"),
    );
    }, [okoSvm]);

  const handleClickSolOnchainSignLegacy = useCallback(async () => {
    if (okoSvm === null) {
      throw new Error("okoSvm is not initialized");
    }

    if (!okoSvm.connected) {
      await okoSvm.connect();
    }

    if (!okoSvm.publicKey) {
      throw new Error("No public key available");
    }

    const connection = new Connection(SOLANA_RPC_URL);

    const toAddress = new PublicKey("11111111111111111111111111111111");

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: okoSvm.publicKey,
        toPubkey: toAddress,
        lamports: 0.001 * LAMPORTS_PER_SOL,
      }),
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = okoSvm.publicKey;

    const signedTransaction = await okoSvm.signTransaction(transaction);

    console.log(
      "Solana legacy signed transaction:",
      signedTransaction.signatures.map((sig) =>
        sig.signature ? Buffer.from(sig.signature).toString("hex") : null,
      ),
    );
  }, [okoSvm]);

  return (
    <SignWidget
      chain="Solana"
      chainIcon={<SolanaIcon />}
      signType="onchain"
      signButtonOnClick={
        isLegacy ? handleClickSolOnchainSignLegacy : handleClickSolOnchainSignV0
      }
      renderBottom={() => (
        <div className={styles.checkboxContainer}>
          <Checkbox
            size="sm"
            id="set-tx-version"
            checked={isLegacy}
            onChange={() => setIsLegacy((prevState) => !prevState)}
            label="Legacy Transaction"
          />
        </div>
      )}
    />
  );
};
