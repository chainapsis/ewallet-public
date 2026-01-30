import { SolanaIcon } from "@oko-wallet/oko-common-ui/icons/solana_icon";

import { SignWidget } from "@oko-wallet-demo-web/components/widgets/sign_widget/sign_widget";
import { useSDKState } from "@oko-wallet-demo-web/state/sdk";

export const SolanaOffchainSignWidget = () => {
  const okoSvm = useSDKState((state) => state.oko_svm);

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
    />
  );
};
