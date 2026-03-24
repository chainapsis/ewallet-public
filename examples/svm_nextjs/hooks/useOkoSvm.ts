import { useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoSvm as useOkoSvmSDK } from "@oko-wallet/oko-sdk-react/svm";

export default function useOkoSvm() {
  const { isReady, isSignedIn, signIn, signOut } = useOko();
  const { svmWallet, isReady: isSvmReady } = useOkoSvmSDK();

  return {
    isReady: isReady && isSvmReady,
    isSignedIn,
    signIn,
    signOut,
    address: svmWallet?.publicKey?.toBase58() ?? null,
    okoSvm: svmWallet,
  };
}
