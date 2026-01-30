"use client";

import { useActiveAccount, useSignAndSendTransaction } from "@rialo/frost";
import {
  PublicKey,
  TransactionBuilder,
  transferInstruction,
} from "@rialo/ts-cdk";
import Link from "next/link";
import { useState } from "react";

import Button from "./Button";

export function SignTransactionWidget() {
  const activeAccount = useActiveAccount();
  const { mutate: signAndSendTransaction, isPending } =
    useSignAndSendTransaction();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendTransaction = () => {
    if (!activeAccount?.address) {
      return;
    }

    setError(null);
    setSignature(null);

    try {
      const kelvins = Math.floor(parseFloat(amount) * 1_000_000_000);
      if (kelvins <= 0) {
        setError("Amount must be greater than 0");
        return;
      }

      if (!recipient) {
        setError("Recipient address is required");
        return;
      }

      const fromPubkey = PublicKey.fromString(activeAccount.address);
      const toPubkey = PublicKey.fromString(recipient);
      const validFrom = BigInt(Date.now());

      const transaction = TransactionBuilder.create()
        .setPayer(fromPubkey)
        .setValidFrom(validFrom)
        .addInstruction(
          transferInstruction(fromPubkey, toPubkey, BigInt(kelvins)),
        )
        .build();

      signAndSendTransaction(
        { transaction },
        {
          onSuccess: (result) => {
            setSignature(result.signature);
            console.log(
              "[sandbox_frost_kit] Transaction sent:",
              result.signature,
            );
          },
          onError: (err) => {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            console.error(
              "[sandbox_frost_kit] Failed to send transaction:",
              errorMessage,
            );
          },
        },
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error(
        "[sandbox_frost_kit] Failed to send transaction:",
        errorMessage,
      );
    }
  };

  return (
    <div className="bg-widget border border-widget-border rounded-3xl p-10 shadow-xl">
      <h3 className="text-2xl font-semibold tracking-tight mb-2">
        Send Transaction
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Create and send a RIALO transfer transaction (Devnet)
      </p>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
            Recipient Address
          </label>
          <input
            type="text"
            className="w-full bg-widget-field border border-widget-border rounded-2xl px-6 py-5 font-mono text-sm focus:outline-none focus:border-widget-border-hover focus:ring-2 focus:ring-widget-border-hover transition-all"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter Rialo address..."
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
            Amount (RIALO)
          </label>
          <input
            type="number"
            className="w-full bg-widget-field border border-widget-border rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-widget-border-hover focus:ring-2 focus:ring-widget-border-hover transition-all"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001"
            step="0.001"
            min="0"
          />
        </div>

        <Button
          onClick={handleSendTransaction}
          disabled={isPending || !recipient}
          loading={isPending}
          size="lg"
          fullWidth
        >
          Send Transaction
        </Button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {signature && (
        <div className="mt-6 flex flex-col gap-3">
          <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
            Transaction Signature
          </label>
          <code className="block bg-widget-field border border-widget-border rounded-2xl px-6 py-5 font-mono text-xs break-all text-green-400">
            {signature}
          </code>
          <Link
            href={`https://explorer.rialo.com/tx/${signature}?cluster=devnet`}
            target="_blank"
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white underline underline-offset-4"
          >
            View on Rialo Explorer
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
      )}
    </div>
  );
}
