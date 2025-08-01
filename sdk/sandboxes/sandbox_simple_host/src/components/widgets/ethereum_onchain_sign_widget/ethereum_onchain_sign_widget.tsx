import React from "react";
import {
  keccak256,
  parseTransaction,
  isAddressEqual,
  recoverPublicKey,
  serializeTransaction,
  type Signature,
} from "viem";
import { publicKeyToEthereumAddress } from "@keplr-ewallet/ewallet-sdk-eth";

import { SignWidget } from "@/components/widgets/sign_widget/sign_widget";
import { useKeplrEwallet } from "@/components/keplr_ewallet_provider/use_keplr_ewallet";

export const EthereumOnchainSignWidget = () => {
  const { ethEWallet } = useKeplrEwallet();

  const handleClickEthOnchainSign = async () => {
    if (ethEWallet === null) {
      throw new Error("EthEWallet is not initialized");
    }

    await ethEWallet.switchChain(8453);

    const provider = await ethEWallet.getEthereumProvider();

    // works fine
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xa" }],
    });

    const address = await ethEWallet.getAddress();
    const signedTx = await provider.request({
      method: "eth_signTransaction",
      params: [
        {
          type: "0x2",
          from: address,
          to: "0xbb6B34131210C091cb2890b81fCe7103816324a5", // dogemos.eth
          value: "0x1",
        },
      ],
    });

    const parsedTx = parseTransaction(signedTx);

    console.log("parsedTx", parsedTx);

    const signature: Signature = {
      r: parsedTx.r!,
      s: parsedTx.s!,
      v: parsedTx.v!,
      yParity: parsedTx.yParity,
    };

    const txWithoutSignature = {
      ...parsedTx,
      r: undefined,
      s: undefined,
      v: undefined,
      yParity: undefined,
    };

    const txHash = keccak256(serializeTransaction(txWithoutSignature));

    const recoveredPublicKey = await recoverPublicKey({
      hash: txHash,
      signature,
    });

    const recoveredAddress = publicKeyToEthereumAddress(recoveredPublicKey);

    const isRecoveredAddressEqual = isAddressEqual(recoveredAddress, address);

    if (!isRecoveredAddressEqual) {
      throw new Error("Recovered address is not equal to the address");
    }

    console.log("signature", signature);
    console.log("txHash", txHash);
    console.log("recoveredAddress", recoveredAddress);
    console.log("isRecoveredAddressEqual", isRecoveredAddressEqual);
  };

  return (
    <SignWidget
      chain="Ethereum"
      signType="onchain"
      signButtonOnClick={handleClickEthOnchainSign}
    />
  );
};
