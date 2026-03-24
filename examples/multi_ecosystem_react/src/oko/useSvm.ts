import { useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import { Connection, clusterApiUrl } from "@solana/web3.js";

const connection = new Connection(clusterApiUrl("devnet"));

export default function useSvm() {
  const { isReady, isSignedIn, signIn, signOut } = useOko();
  const { svmWallet, isReady: isSvmReady } = useOkoSvm();

  return {
    isReady: isReady && isSvmReady,
    isSignedIn,
    isSigningIn: false,
    okoSvm: svmWallet,
    svmAddress: svmWallet?.publicKey?.toBase58() ?? null,
    signIn,
    signOut,
    connection,
  };
}
