import { createContext, useEffect, useState } from "react";
import {
  OkoCosmosWallet,
  getBech32Address,
  getCosmosAddress,
  type OkoCosmosWalletInterface,
} from "@oko-wallet/oko-sdk-cosmos";
import {
  OkoEthWallet,
  type OkoEthWalletInterface,
} from "@oko-wallet/oko-sdk-eth";
import {
  OkoSvmWallet,
  type OkoSvmWalletInterface,
} from "@oko-wallet/oko-sdk-svm";
import type { ChainInfo } from "@keplr-wallet/types";
import type { OfflineDirectSigner } from "@cosmjs/proto-signing";
import type { Address } from "viem";

interface OkoProviderValues {
  isReady: boolean;
  isSignedIn: boolean;
  isSigningIn: boolean;
  // cosmos
  publicKey: Uint8Array | null;
  bech32Address: string | null;
  offlineSigner: OfflineDirectSigner | null;
  chainInfo: ChainInfo;
  // evm
  address: Address | null;
  okoEth: OkoEthWalletInterface | null;
  // svm
  okoSvm: OkoSvmWalletInterface | null;
  svmAddress: string | null;
  // auth
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

const OkoContext = createContext<OkoProviderValues>({
  isReady: false,
  isSignedIn: false,
  isSigningIn: false,
  publicKey: null,
  bech32Address: null,
  offlineSigner: null,
  chainInfo,
  address: null,
  okoEth: null,
  okoSvm: null,
  svmAddress: null,
  signIn: async () => {},
  signOut: async () => {},
});

function OkoProvider({ children }: { children: React.ReactNode }) {
  const [okoCosmos, setOkoCosmos] = useState<OkoCosmosWalletInterface | null>(
    null,
  );
  const [okoEth, setOkoEth] = useState<OkoEthWalletInterface | null>(null);
  const [okoSvm, setOkoSvm] = useState<OkoSvmWalletInterface | null>(null);

  const [offlineSigner, setOfflineSigner] =
    useState<OfflineDirectSigner | null>(null);

  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [publicKey, setPublicKey] = useState<Uint8Array | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [svmAddress, setSvmAddress] = useState<string | null>(null);

  const bech32Address = publicKey
    ? getBech32Address(
        getCosmosAddress(publicKey),
        chainInfo.bech32Config?.bech32PrefixAccAddr ?? "",
      )
    : null;

  async function init() {
    const apiKey = import.meta.env.VITE_OKO_API_KEY ?? "";
    const sdkEndpoint = import.meta.env.VITE_OKO_SDK_ENDPOINT ?? undefined;

    const cosmosInit = OkoCosmosWallet.init({
      api_key: apiKey,
      sdk_endpoint: sdkEndpoint,
    });
    const ethInit = OkoEthWallet.init({
      api_key: apiKey,
      sdk_endpoint: sdkEndpoint,
    });
    const svmInit = OkoSvmWallet.init({
      api_key: apiKey,
      sdk_endpoint: sdkEndpoint,
      chain_id: "solana:devnet",
    });

    if (!cosmosInit.success) {
      console.error(cosmosInit.err);
      return;
    }
    if (!ethInit.success) {
      console.error(ethInit.err);
      return;
    }
    if (!svmInit.success) {
      console.error(svmInit.err);
      return;
    }

    const c = cosmosInit.data;
    const e = ethInit.data;
    const s = svmInit.data;
    const signer = c.getOfflineSigner("osmo-test-5");

    try {
      const [pk, addr] = await Promise.all([
        c.getPublicKey().catch(() => null),
        e.getAddress().catch(() => null),
      ]);

      let solAddr: string | null = null;
      try {
        await s.connect();
        solAddr = s.publicKey?.toBase58() ?? null;
      } catch {
        // not signed in yet
      }

      if (pk) {
        setPublicKey(pk);
      }
      if (addr) {
        setAddress(addr);
      }
      if (solAddr) {
        setSvmAddress(solAddr);
      }
      setIsSignedIn(!!pk || !!addr || !!solAddr);
    } catch (err) {
      console.error(err);
      setIsSignedIn(false);
      setPublicKey(null);
      setAddress(null);
      setSvmAddress(null);
    } finally {
      setOkoCosmos(c);
      setOkoEth(e);
      setOkoSvm(s);
      setOfflineSigner(signer);
    }
  }

  async function signIn() {
    if (!okoCosmos && !okoEth) {
      return;
    }

    // sign-in via core Oko wallet (available from either instance)
    const okoWallet = okoCosmos?.okoWallet ?? okoEth?.okoWallet;
    if (!okoWallet) {
      return;
    }

    setIsSigningIn(true);

    try {
      await okoWallet.signIn("google");

      const [pk, addr] = await Promise.all([
        okoCosmos?.getPublicKey().catch(() => null),
        okoEth?.getAddress().catch(() => null),
      ]);

      let solAddr: string | null = null;
      try {
        await okoSvm?.connect();
        solAddr = okoSvm?.publicKey?.toBase58() ?? null;
      } catch {
        // ignore
      }

      if (pk) {
        setPublicKey(pk);
      }
      if (addr) {
        setAddress(addr);
      }
      if (solAddr) {
        setSvmAddress(solAddr);
      }
      setIsSignedIn(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    try {
      await (okoCosmos?.okoWallet ?? okoEth?.okoWallet)?.signOut();
    } finally {
      setIsSignedIn(false);
      setPublicKey(null);
      setAddress(null);
      setSvmAddress(null);
    }
  }

  useEffect(() => {
    init().catch(console.error);
  }, []);

  return (
    <OkoContext.Provider
      value={{
        isReady: !!okoCosmos && !!okoEth && !!okoSvm,
        isSignedIn,
        isSigningIn,
        publicKey,
        bech32Address,
        offlineSigner,
        chainInfo,
        address,
        okoEth,
        okoSvm,
        svmAddress,
        signIn,
        signOut,
      }}
    >
      {children}
    </OkoContext.Provider>
  );
}

export { OkoProvider, OkoContext };
