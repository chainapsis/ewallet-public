"use client";

import ConnectWalletButton from "./ConnectWalletButton";
import TransactionForm from "./TransactionForm";

export default function ConnectedView() {
  return (
    <div className="w-full max-w-xl mx-auto px-8 py-16">
      <div className="flex flex-col gap-6">
        <ConnectWalletButton />
        <TransactionForm />
      </div>
    </div>
  );
}
