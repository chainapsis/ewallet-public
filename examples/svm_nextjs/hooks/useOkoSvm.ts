import { useContext } from "react";

import { OkoSvmContext } from "@/components/OkoSvmProvider";

export default function useOkoSvm() {
  const { isReady, isSignedIn, isSigningIn, address, okoSvm, signIn, signOut } =
    useContext(OkoSvmContext);

  return {
    isReady,
    isSignedIn,
    isSigningIn,
    address,
    okoSvm,
    signIn,
    signOut,
  };
}
