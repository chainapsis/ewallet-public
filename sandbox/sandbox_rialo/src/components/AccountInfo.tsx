"use client";

import { useNativeBalance } from "@rialo/frost";
import Link from "next/link";
import { type ReactNode, useState } from "react";

import Button from "./Button";

interface AccountInfoProps {
  publicKey: string;
  onDisconnect: () => void;
  className?: string;
}

export default function AccountInfo({
  publicKey,
  onDisconnect,
  className,
}: AccountInfoProps) {
  const { balance, isLoading: isLoadingBalance, refetch } = useNativeBalance();

  function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  const balanceDisplay = isLoadingBalance
    ? "..."
    : balance !== null
      ? `${(Number(balance) / 1_000_000_000).toFixed(4)} RIALO`
      : "--";

  return (
    <div
      className={`bg-widget border border-widget-border rounded-3xl p-10 shadow-xl h-full flex flex-col ${
        className ?? ""
      }`}
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-semibold tracking-tight">Account</h3>
        <Button onClick={onDisconnect} variant="ghost" size="sm">
          Sign out
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <CopyableAddress value={publicKey} format={formatAddress} />
        <AvailableBalance
          value={balanceDisplay}
          onRefresh={refetch}
          isLoading={isLoadingBalance}
        />
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300 mb-2">
      {children}
    </label>
  );
}

function CopyableAddress({
  value,
  format,
}: {
  value?: string;
  format?: (value: string) => string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel>Wallet Address</FieldLabel>
      <button
        type="button"
        onClick={async () => {
          if (!value) {
            return;
          }
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="group flex items-center justify-between bg-widget-field border border-widget-border rounded-2xl px-6 py-5 font-mono text-sm hover:border-widget-border-hover transition-colors text-left"
      >
        <span className="truncate mr-4">
          {format && value ? format(value) : "No address"}
        </span>
        <span className="relative flex items-center">
          <svg
            className={`h-5 w-5 transition-opacity ${
              copied ? "opacity-0" : "opacity-80 group-hover:opacity-100"
            }`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 9.5C9 8.67157 9.67157 8 10.5 8H17.5C18.3284 8 19 8.67157 19 9.5V16.5C19 17.3284 18.3284 18 17.5 18H10.5C9.67157 18 9 17.3284 9 16.5V9.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7 15.5H6.5C5.67157 15.5 5 14.8284 5 14V7C5 6.17157 5.67157 5.5 6.5 5.5H13.5C14.3284 5.5 15 6.17157 15 7V7.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <svg
            className={`absolute right-0 h-5 w-5 text-green-400 transition-opacity ${
              copied ? "opacity-100" : "opacity-0"
            }`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 6L9 17L4 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>
  );
}

function AvailableBalance({
  value,
  onRefresh,
  isLoading,
}: {
  value?: string;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 mt-2">
      <div className="flex items-center justify-between">
        <FieldLabel>Available Balance</FieldLabel>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          title="Refresh balance"
        >
          <svg
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C15.3313 3 18.2398 4.80826 19.8299 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M21 3V7.5H16.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="bg-widget-field border border-widget-border rounded-2xl px-6 py-6 hover:border-widget-border-hover transition-colors">
        <div className="text-3xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent leading-tight">
          {value ?? "..."}
        </div>
        <Link
          href="https://rialo.com/faucet"
          target="_blank"
          className="inline-flex items-center gap-2 mt-3 text-sm text-gray-300 hover:text-white underline underline-offset-4"
        >
          Get Rialo devnet tokens
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 17L17 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M9 7H17V15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
