"use client";

import AccountInfo from "./AccountInfo";
import TransactionForm from "./TransactionForm";

export default function ConnectedView() {
  return (
    <div className="w-full max-w-6xl mx-auto px-8 py-16">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="flex-1 min-w-0">
          <AccountInfo />
        </div>
        <div className="flex-1 min-w-0">
          <TransactionForm />
        </div>
      </div>
    </div>
  );
}
