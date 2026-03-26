import { SolanaIcon } from "@oko-wallet/oko-common-ui/icons/solana_icon";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";

// import styles from "../sign_widget/sign_widget.module.scss";
import { SignWidget } from "@oko-wallet-demo-web/components/widgets/sign_widget/sign_widget";

export const SolanaOffchainSignWidget = () => {
  const { svmWallet: okoSvm } = useOkoSvm();

  const handleClickSolOffchainSign = async () => {
    if (okoSvm === null) {
      throw new Error("okoSvm is not initialized");
    }

    // Connect if not already connected
    if (!okoSvm.connected) {
      await okoSvm.connect();
    }

    const message = "Welcome to Oko! Try generating an Ed25519 MPC signature.";
    const messageBytes = new TextEncoder().encode(message);

    const signature = await okoSvm.signMessage(messageBytes);

    // Log signature for demo purposes
    console.log("Solana signature:", Buffer.from(signature).toString("hex"));
  };

  return (
    <SignWidget
      chain="Solana"
      chainIcon={<SolanaIcon />}
      signType="offchain"
      signButtonOnClick={handleClickSolOffchainSign}
      // badge={<span className={styles.badge}>Rialo</span>}
    />
  );
};
