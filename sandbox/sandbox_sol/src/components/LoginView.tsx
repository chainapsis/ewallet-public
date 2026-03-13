"use client";

import Image from "next/image";

import Button from "./Button";

interface LoginViewProps {
  isInitialized: boolean;
  isInitializing: boolean;
  onConnect: () => void;
}

export default function LoginView({
  isInitialized,
  isInitializing,
  onConnect,
}: LoginViewProps) {
  return (
    <div className="text-center max-w-md mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        <div className="mx-auto flex items-center justify-center">
          <Image src="/logo.png" alt="Oko" width={180} height={80} />
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-4xl font-bold">Welcome to Oko</h2>
          <p className="text-gray-400 text-lg">
            Sign in to get started with Solana
          </p>
        </div>
      </div>
      <Button
        onClick={onConnect}
        fullWidth
        size="lg"
        disabled={!isInitialized || isInitializing}
        loading={isInitializing}
      >
        Sign in
      </Button>

      <a
        href="/wallet-adapter"
        className="text-blue-400 hover:underline text-sm"
      >
        Test Wallet Adapter Integration
      </a>
    </div>
  );
}
