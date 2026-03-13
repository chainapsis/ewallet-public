"use client";

import Image from "next/image";

import useOkoEvm from "@/hooks/useOkoEvm";
import Button from "./Button";

export default function LoginView() {
  const { isReady, isSigningIn, signIn } = useOkoEvm();

  return (
    <div className="text-center max-w-md mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        <div className="mx-auto flex items-center justify-center">
          <Image src="/logo.png" alt="Oko" width={180} height={79.785} />
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-4xl font-bold">Welcome to Oko</h2>
          <p className="text-gray-400 text-lg">
            Sign in to get started with EVM chains
          </p>
        </div>
      </div>
      <Button
        onClick={signIn}
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
