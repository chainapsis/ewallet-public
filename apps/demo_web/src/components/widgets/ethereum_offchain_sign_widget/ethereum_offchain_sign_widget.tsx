import { EthereumBlueIcon } from "@oko-wallet/oko-common-ui/icons/ethereum_blue_icon";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { isAddressEqual, recoverMessageAddress } from "viem";

import { SignWidget } from "@oko-wallet-demo-web/components/widgets/sign_widget/sign_widget";

export const EthereumOffchainSignWidget = () => {
  const { ethWallet: okoEth } = useOkoEth();

  const handleClickEthOffchainSign = async () => {
    if (okoEth === null) {
      throw new Error("okoEth is not initialized");
    }

    const message = "Welcome to Oko! 🚀 Try generating an MPC signature.";

    const signature = await okoEth.sign(message);

    const address = await okoEth.getAddress();
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature,
    });

    if (!isAddressEqual(recoveredAddress, address)) {
      throw new Error("Recovered address is not equal to the address");
    }
  };

  return (
    <SignWidget
      chain="Ethereum"
      chainIcon={<EthereumBlueIcon />}
      signType="offchain"
      signButtonOnClick={handleClickEthOffchainSign}
    />
  );
};
