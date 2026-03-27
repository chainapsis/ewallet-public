"use client";

import { useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import Image from "next/image";
import { useState } from "react";

import Button from "./Button";

export default function LoginView() {
  const { signIn } = useOko();
  const { isReady } = useOkoCosmos();
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSignIn() {
    setIsSigningIn(true);
    try {
      await signIn("google");
    } finally {
      setIsSigningIn(false);
    }
  }

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
        disabled={!isReady || isSigningIn}
        loading={!isReady || isSigningIn}
      >
        Sign in
      </Button>
    </div>
  );
}
