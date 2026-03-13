import type { OfflineDirectSigner } from "@cosmjs/proto-signing";
import type { ChainInfo } from "@keplr-wallet/types";
import {
  getBech32Address,
  getCosmosAddress,
  OkoCosmosWallet,
  type OkoCosmosWalletInterface,
} from "@oko-wallet/oko-sdk-cosmos";
import { createContext, useEffect, useState } from "react";

interface OkoCosmosProviderValues {
  isReady: boolean;
  isSignedIn: boolean;
  isSigningIn: boolean;
  publicKey: Uint8Array | null;
  bech32Address: string | null;
  offlineSigner: OfflineDirectSigner | null;
  chainInfo: ChainInfo;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const chainInfo: ChainInfo = {
  rpc: "https://rpc.testnet.osmosis.zone",
  rest: "https://lcd.testnet.osmosis.zone",
  chainId: "osmo-test-5",
  chainName: "Osmosis Testnet",
  chainSymbolImageUrl:
    "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/osmosis/chain.png",
  bip44: {
    coinType: 118,
  },
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
      gasPriceStep: {
        low: 0.0025,
        average: 0.025,
        high: 0.04,
      },
    },
  ],
  features: [],
  isTestnet: true,
};

const OkoCosmosContext = createContext<OkoCosmosProviderValues>({
  isReady: false,
  isSignedIn: false,
  isSigningIn: false,
  publicKey: null,
  bech32Address: null,
  offlineSigner: null,
  chainInfo,
  signIn: async () => {},
  signOut: async () => {},
});

function OkoCosmosProvider({ children }: { children: React.ReactNode }) {
  const [okoCosmos, setOkoCosmos] = useState<OkoCosmosWalletInterface | null>(
    null,
  );
  const [offlineSigner, setOfflineSigner] =
    useState<OfflineDirectSigner | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [publicKey, setPublicKey] = useState<Uint8Array | null>(null);

  const bech32Address = publicKey
    ? getBech32Address(
        getCosmosAddress(publicKey),
        chainInfo.bech32Config?.bech32PrefixAccAddr ?? "",
      )
    : null;

  async function initOkoCosmos() {
    const initRes = OkoCosmosWallet.init({
      api_key: process.env.NEXT_PUBLIC_OKO_API_KEY ?? "",
      sdk_endpoint: process.env.NEXT_PUBLIC_OKO_SDK_ENDPOINT ?? undefined,
    });

    if (!initRes.success) {
      console.error(initRes.err);
      return;
    }

    const okoCosmos = initRes.data;
    const offlineSigner = okoCosmos.getOfflineSigner("osmo-test-5");

    try {
      const publicKey = await okoCosmos.getPublicKey();

      setPublicKey(publicKey);
      setIsSignedIn(true);
    } catch (error) {
      // sign in required
      console.error(error);
      setIsSignedIn(false);
      setPublicKey(null);
    } finally {
      setOkoCosmos(okoCosmos);
      setOfflineSigner(offlineSigner);
    }
  }

  async function signIn() {
    if (!okoCosmos) {
      return;
    }

    setIsSigningIn(true);

    try {
      await okoCosmos.okoWallet.signIn("google");

      const publicKey = await okoCosmos.getPublicKey();

      setIsSignedIn(true);
      setPublicKey(publicKey);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    await okoCosmos?.okoWallet.signOut();
    setIsSignedIn(false);
    setPublicKey(null);
  }

  useEffect(() => {
    initOkoCosmos().catch(console.error);
  }, []);

  return (
    <OkoCosmosContext.Provider
      value={{
        isReady: !!okoCosmos,
        isSignedIn,
        isSigningIn,
        publicKey,
        bech32Address,
        offlineSigner,
        chainInfo,
        signIn,
        signOut,
      }}
    >
      {children}
    </OkoCosmosContext.Provider>
  );
}

export { OkoCosmosProvider, OkoCosmosContext };
