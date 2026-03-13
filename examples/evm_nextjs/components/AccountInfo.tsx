"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { formatEther } from "viem";

import useOkoEvm from "@/hooks/useOkoEvm";
import usePublicClient from "@/hooks/usePublicClient";
import Button from "./Button";

interface AccountInfoProps {
  className?: string;
}

export default function AccountInfo({ className }: AccountInfoProps) {
  const { address, signOut } = useOkoEvm();
  const publicClient = usePublicClient();

  const { data: balance } = useQuery({
    queryKey: ["balance", address],
    queryFn: async () => {
      if (!publicClient || !address) {
        throw new Error("Public client or address is not available");
      }

      const balance = await publicClient.getBalance({
        address: address,
      });

      return `${formatEther(balance)} ETH`;
    },
    enabled: !!publicClient && !!address,
  });

  function formatAddress(address: string) {
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  }

  return (
    <div
      className={`bg-widget border border-widget-border rounded-3xl p-10 shadow-xl h-full flex flex-col ${
        className ?? ""
      }`}
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-semibold tracking-tight">Account</h3>
        <Button onClick={signOut} variant="ghost" size="sm">
          Sign out
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <CopyableAddress value={address!} format={formatAddress} />
        <AvailableBalance value={balance} />
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
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

function AvailableBalance({ value }: { value?: string }) {
  return (
    <div className="flex flex-col gap-3 mt-2">
      <FieldLabel>Available Balance</FieldLabel>
      <div className="bg-widget-field border border-widget-border rounded-2xl px-6 py-6 hover:border-widget-border-hover transition-colors">
        <div className="text-3xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent leading-tight">
          {value ?? "..."}
        </div>
        <Link
          href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
          target="_blank"
          className="inline-flex items-center gap-2 mt-3 text-sm text-gray-300 hover:text-white underline underline-offset-4"
        >
          Get Ethereum Sepolia test ETH
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
