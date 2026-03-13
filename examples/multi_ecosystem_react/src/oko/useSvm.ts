import { Connection, clusterApiUrl } from "@solana/web3.js";
import { useContext } from "react";

import { OkoContext } from "./OkoProvider";

export default function useSvm() {
  const ctx = useContext(OkoContext);
  const connection = new Connection(clusterApiUrl("devnet"));

  return {
    isReady: ctx.isReady,
    isSignedIn: ctx.isSignedIn,
    isSigningIn: ctx.isSigningIn,
    okoSvm: ctx.okoSvm,
    svmAddress: ctx.svmAddress,
    signIn: ctx.signIn,
    signOut: ctx.signOut,
    connection,
  };
}
