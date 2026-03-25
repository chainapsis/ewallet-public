import { useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

export default function useEvm() {
  const { isReady, isSignedIn, signIn, signOut } = useOko();
  const { ethWallet, isReady: isEthReady, address } = useOkoEth();

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  return {
    isReady: isReady && isEthReady,
    isSignedIn,
    isSigningIn: false,
    address,
    okoEth: ethWallet,
    signIn,
    signOut,
    publicClient,
  };
}
