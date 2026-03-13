import {
  OkoEthWallet,
  type OkoEthWalletInterface,
} from "@oko-wallet/oko-sdk-eth";
import { createContext, useEffect, useState } from "react";
import type { Address } from "viem";

interface OkoEvmProviderValues {
  isReady: boolean;
  isSignedIn: boolean;
  isSigningIn: boolean;
  address: Address | null;
  okoEth: OkoEthWalletInterface | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const OkoEvmContext = createContext<OkoEvmProviderValues>({
  isReady: false,
  isSignedIn: false,
  isSigningIn: false,
  address: null,
  okoEth: null,
  signIn: async () => {},
  signOut: async () => {},
});

function OkoEvmProvider({ children }: { children: React.ReactNode }) {
  const [okoEth, setOkoEth] = useState<OkoEthWalletInterface | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);

  async function initOkoEvm() {
    const initRes = OkoEthWallet.init({
      api_key: process.env.NEXT_PUBLIC_OKO_API_KEY ?? "",
    });

    if (!initRes.success) {
      console.error(initRes.err);
      return;
    }

    const okoEth = initRes.data;

    try {
      const address = await okoEth.getAddress();

      setAddress(address);
      setIsSignedIn(true);
    } catch (error) {
      // sign in required
      console.error(error);
      setIsSignedIn(false);
      setAddress(null);
    } finally {
      setOkoEth(okoEth);
    }
  }

  async function signIn() {
    if (!okoEth) {
      return;
    }

    setIsSigningIn(true);

    try {
      await okoEth.okoWallet.signIn("google");

      const address = await okoEth.getAddress();

      setIsSignedIn(true);
      setAddress(address);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    await okoEth?.okoWallet.signOut();
    setIsSignedIn(false);
    setAddress(null);
  }

  useEffect(() => {
    initOkoEvm().catch(console.error);
  }, []);

  return (
    <OkoEvmContext.Provider
      value={{
        isReady: !!okoEth,
        isSignedIn,
        isSigningIn,
        address,
        okoEth,
        signIn,
        signOut,
      }}
    >
      {children}
    </OkoEvmContext.Provider>
  );
}

export { OkoEvmProvider, OkoEvmContext };
