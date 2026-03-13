"use client";

import { WalletStatus } from "@cosmos-kit/core";
import { useChain } from "@cosmos-kit/react";

import ConnectedView from "./ConnectedView";
import LoginView from "./LoginView";

export default function App() {
  const { status } = useChain("osmosistestnet");

  const isSignedIn = status === WalletStatus.Connected;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      {!isSignedIn ? <LoginView /> : <ConnectedView />}
    </div>
  );
}
