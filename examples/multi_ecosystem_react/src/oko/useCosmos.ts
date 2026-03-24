import type { ChainInfo } from "@keplr-wallet/types";
import { getBech32Address, getCosmosAddress } from "@oko-wallet/oko-sdk-cosmos";
import { useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useMemo } from "react";

const chainInfo: ChainInfo = {
  rpc: "https://rpc.testnet.osmosis.zone",
  rest: "https://lcd.testnet.osmosis.zone",
  chainId: "osmo-test-5",
  chainName: "Osmosis Testnet",
  chainSymbolImageUrl:
    "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/osmosis/chain.png",
  bip44: { coinType: 118 },
  bech32Config: {
    bech32PrefixAccAddr: "osmo",
    bech32PrefixAccPub: "osmopub",
    bech32PrefixValAddr: "osmovaloper",
    bech32PrefixValPub: "osmovaloperpub",
    bech32PrefixConsAddr: "osmovalcons",
    bech32PrefixConsPub: "osmovalconspub",
  },
  stakeCurrency: {
    coinDenom: "OSMO",
    coinMinimalDenom: "uosmo",
    coinDecimals: 6,
    coinImageUrl:
      "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/osmosis/uosmo.png",
  },
  currencies: [
    {
      coinDenom: "OSMO",
      coinMinimalDenom: "uosmo",
      coinDecimals: 6,
      coinImageUrl:
        "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/osmosis/uosmo.png",
    },
    {
      coinDenom: "ION",
      coinMinimalDenom: "uion",
      coinDecimals: 6,
      coinImageUrl:
        "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/osmosis/uion.png",
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "OSMO",
      coinMinimalDenom: "uosmo",
      coinDecimals: 6,
      coinImageUrl:
        "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/osmosis/uosmo.png",
      gasPriceStep: { low: 0.0025, average: 0.025, high: 0.04 },
    },
  ],
  features: [],
  isTestnet: true,
};

export default function useCosmos() {
  const { isReady, isSignedIn, signIn, signOut, walletInfo } = useOko();
  const { cosmosWallet, isReady: isCosmosReady } = useOkoCosmos();

  const bech32Address = useMemo(() => {
    if (!walletInfo.publicKey) {
      return null;
    }
    const publicKeyBytes = Buffer.from(walletInfo.publicKey, "base64");
    return getBech32Address(
      getCosmosAddress(publicKeyBytes),
      chainInfo.bech32Config?.bech32PrefixAccAddr ?? "",
    );
  }, [walletInfo.publicKey]);

  const offlineSigner = useMemo(() => {
    if (!cosmosWallet) {
      return null;
    }
    return cosmosWallet.getOfflineSigner(chainInfo.chainId);
  }, [cosmosWallet]);

  return {
    isReady: isReady && isCosmosReady,
    isSignedIn,
    isSigningIn: false,
    signIn,
    signOut,
    bech32Address,
    offlineSigner,
    chainInfo,
  };
}
