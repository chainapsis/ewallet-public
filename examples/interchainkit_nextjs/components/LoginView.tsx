"use client";

import { WalletState } from "@interchain-kit/core";
import { useChain } from "@interchain-kit/react";
import Image from "next/image";

import Button from "./Button";

export default function LoginView() {
  const { status, openView } = useChain("osmosistestnet");

  const handleSignIn = () => {
    openView();
  };

  return (
    <div className="text-center max-w-md mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        <div className="mx-auto flex items-center justify-center">
          <Image src="/logo.png" alt="Oko" width={180} height={79.785} />
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-4xl font-bold">Welcome to Oko</h2>
          <p className="text-gray-400 text-lg">
            Sign in to get started with Cosmos chains
          </p>
        </div>
      </div>
      <Button
        onClick={handleSignIn}
        fullWidth
        size="lg"
        disabled={status !== WalletState.Disconnected}
        loading={status === WalletState.Connecting}
      >
        Sign in
      </Button>
    </div>
  );
}
