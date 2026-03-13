import {
  OkoSvmWallet,
  type OkoSvmWalletInterface,
} from "@oko-wallet/oko-sdk-svm";
import { createContext, useEffect, useState } from "react";

interface OkoSvmProviderValues {
  isReady: boolean;
  isSignedIn: boolean;
  isSigningIn: boolean;
  address: string | null;
  okoSvm: OkoSvmWalletInterface | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const OkoSvmContext = createContext<OkoSvmProviderValues>({
  isReady: false,
  isSignedIn: false,
  isSigningIn: false,
  address: null,
  okoSvm: null,
  signIn: async () => {},
  signOut: async () => {},
});

function OkoSvmProvider({ children }: { children: React.ReactNode }) {
  const [okoSvm, setOkoSvm] = useState<OkoSvmWalletInterface | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  async function initOkoSvm() {
    const initRes = OkoSvmWallet.init({
      api_key: process.env.NEXT_PUBLIC_OKO_API_KEY ?? "",
      sdk_endpoint: process.env.NEXT_PUBLIC_OKO_SDK_ENDPOINT ?? undefined,
      chain_id: "solana:devnet",
    });

    if (!initRes.success) {
      console.error(initRes.err);
      return;
    }

    const svm = initRes.data;

    try {
      await svm.connect();
      const solAddr = svm.publicKey?.toBase58() ?? null;
      setAddress(solAddr);
      setIsSignedIn(!!solAddr);
    } catch {
      setIsSignedIn(false);
      setAddress(null);
    } finally {
      setOkoSvm(svm);
    }
  }

  async function signIn() {
    if (!okoSvm) {
      return;
    }

    setIsSigningIn(true);

    try {
      await okoSvm.okoWallet.signIn("google");
      await okoSvm.connect();
      const solAddr = okoSvm.publicKey?.toBase58() ?? null;
      setIsSignedIn(!!solAddr);
      setAddress(solAddr);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    await okoSvm?.okoWallet.signOut();
    setIsSignedIn(false);
    setAddress(null);
  }

  useEffect(() => {
    initOkoSvm().catch(console.error);
  }, []);

  return (
    <OkoSvmContext.Provider
      value={{
        isReady: !!okoSvm,
        isSignedIn,
        isSigningIn,
        address,
        okoSvm,
        signIn,
        signOut,
      }}
    >
      {children}
    </OkoSvmContext.Provider>
  );
}

export { OkoSvmProvider, OkoSvmContext };
