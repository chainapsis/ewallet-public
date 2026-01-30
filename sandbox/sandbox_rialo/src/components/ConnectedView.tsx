"use client";

import AccountInfo from "./AccountInfo";
import { SignMessageWidget } from "./sign_message_widget";
import { SignTransactionWidget } from "./sign_transaction_widget";

interface ConnectedViewProps {
  publicKey: string;
  onDisconnect: () => void;
}

export default function ConnectedView({
  publicKey,
  onDisconnect,
}: ConnectedViewProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-8 py-16">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="flex-1 min-w-0">
          <AccountInfo publicKey={publicKey} onDisconnect={onDisconnect} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          <SignMessageWidget />
          <SignTransactionWidget />
        </div>
      </div>
    </div>
  );
}
