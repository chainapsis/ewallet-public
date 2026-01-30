"use client";

import { ConnectButton } from "@rialo/frost";
import Image from "next/image";

export default function LoginView() {
  return (
    <div className="text-center max-w-md mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        <div className="mx-auto flex items-center justify-center">
          <Image src="/logo.png" alt="Oko" width={180} height={80} />
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-4xl font-bold">Welcome to Oko</h2>
          <p className="text-gray-400 text-lg">
            Sign in to get started with Rialo
          </p>
        </div>
      </div>
      <ConnectButton />
    </div>
  );
}
