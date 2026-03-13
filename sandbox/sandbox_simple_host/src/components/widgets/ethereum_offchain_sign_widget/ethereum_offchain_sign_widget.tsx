import { publicKeyToEthereumAddress } from "@oko-wallet/oko-sdk-eth";
import { type FC, useState } from "react";
import { hashMessage, hashTypedData, recoverPublicKey } from "viem";

import { SignWidget } from "@/components/widgets/sign_widget/sign_widget";
import { useOko } from "@/hooks/use_oko";
import styles from "./ethereum_offchain_sign_widget.module.scss";

export const EthereumOffchainSignWidget: FC = () => {
  const { okoEth } = useOko();
  const [isLoading, setIsLoading] = useState(false);
  const [signType, setSignType] = useState<"personal_sign" | "typed_data_v4">(
    "personal_sign",
  );

  const handleClickEthOffchainSign = async () => {
    if (okoEth === null) {
      console.error("okoEth is not initialized");
      return;
    }

    try {
      setIsLoading(true);

      if (signType === "personal_sign") {
        const message = "Welcome to Oko! 🚀 Try generating an MPC signature.";

        const signature = await okoEth.sign(message);
        console.log("signature", signature);

        const hash = hashMessage(message);
        console.log("hash", hash);

        const publicKey = await recoverPublicKey({ hash, signature });

        const recoveredAddress = publicKeyToEthereumAddress(publicKey);

        console.log("recoveredAddress", recoveredAddress);
      } else if (signType === "typed_data_v4") {
        const domain = {
          name: "Ether Mail",
          version: "1",
          chainId: BigInt(1),
          verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
        } as const;

        const types = {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" },
          ],
          Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" },
          ],
        } as const;
        const primaryType = "Mail";
        const message = {
          from: {
            name: "Canon",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          },
          to: {
            name: "Bob",
            wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          },
          contents: "Hello, Bob!",
        } as const;
        const typedData = {
          domain,
          types,
          primaryType,
          message,
        } as const;

        const provider = await okoEth.getEthereumProvider();
        const signers = await provider.request({
          method: "eth_requestAccounts",
        });

        const signature = await provider.request({
          method: "eth_signTypedData_v4",
          params: [signers[0], typedData],
        });

        console.log("signature", signature);

        const hash = hashTypedData(typedData);
        console.log("hash", hash);

        const publicKey = await recoverPublicKey({ hash, signature });

        const recoveredAddress = publicKeyToEthereumAddress(publicKey);

        console.log("recoveredAddress", recoveredAddress);
      }
    } catch (error) {
      console.error("Failed to sign:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.switch}>
        <button
          type="button"
          className={signType === "personal_sign" ? styles.active : ""}
          onClick={() => setSignType("personal_sign")}
        >
          Personal Sign
        </button>
        <button
          type="button"
          className={signType === "typed_data_v4" ? styles.active : ""}
          onClick={() => setSignType("typed_data_v4")}
        >
          Typed Data v4
        </button>
      </div>
      <SignWidget
        chain="Ethereum"
        signType="offchain"
        isLoading={isLoading}
        signButtonOnClick={handleClickEthOffchainSign}
      />
    </div>
  );
};
