import { useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";

export default function useOkoEvm() {
  const { isReady, isSignedIn, signIn, signOut } = useOko();
  const { ethWallet, isReady: isEthReady } = useOkoEth();

  return {
    isReady: isReady && isEthReady,
    isSignedIn,
    signIn,
    signOut,
    address: ethWallet?.state.address ?? null,
    okoEth: ethWallet,
  };
}
