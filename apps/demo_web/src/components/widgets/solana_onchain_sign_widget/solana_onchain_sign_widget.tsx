import { SolanaIcon } from "@oko-wallet/oko-common-ui/icons/solana_icon";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useCallback } from "react";

// import signStyles from "../sign_widget/sign_widget.module.scss";
import { SignWidget } from "@oko-wallet-demo-web/components/widgets/sign_widget/sign_widget";

const SOLANA_RPC_URL = "https://api.devnet.solana.com";

export const SolanaOnchainSignWidget = () => {
  const { svmWallet: okoSvm } = useOkoSvm();

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

  return (
    <SignWidget
      chain="Solana"
      chainIcon={<SolanaIcon />}
      signType="onchain"
      // badge={<span className={signStyles.badge}>Rialo</span>}
      signButtonOnClick={handleClickSolOnchainSignV0}
    />
  );
};
