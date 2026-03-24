import { useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

export default function useEvm() {
  const { isReady, isSignedIn, signIn, signOut } = useOko();
  const { ethWallet, isReady: isEthReady } = useOkoEth();

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  return {
    isReady: isReady && isEthReady,
    isSignedIn,
    isSigningIn: false,
    address: ethWallet?.state.address ?? null,
    okoEth: ethWallet,
    signIn,
    signOut,
    publicClient,
  };
}
