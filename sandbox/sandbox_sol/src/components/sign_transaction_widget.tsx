"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";

import { useSdkStore } from "@/store/sdk";
import Button from "./Button";
import { DEVNET_CONNECTION } from "@/lib/connection";

export function SignTransactionWidget() {
  const { okoSvmWallet, publicKey } = useSdkStore();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [useVersioned, setUseVersioned] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignTransaction = async () => {
    if (!okoSvmWallet || !publicKey) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSignature(null);

    try {
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(recipient);
      } catch {
        throw new Error("Invalid recipient address");
      }

      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
      if (lamports <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      const fromPubkey = new PublicKey(publicKey);
      const { blockhash } = await DEVNET_CONNECTION.getLatestBlockhash();

      const instruction = SystemProgram.transfer({
        fromPubkey,
        toPubkey: recipientPubkey,
        lamports,
      });

      if (useVersioned) {
        const messageV0 = new TransactionMessage({
          payerKey: fromPubkey,
          recentBlockhash: blockhash,
          instructions: [instruction],
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        const signedTx = await okoSvmWallet.signTransaction(transaction);
        const txSignature = signedTx.signatures[0];

        if (txSignature) {
          setSignature(bs58.encode(txSignature));
        } else {
          setSignature("Transaction signed (no signature extracted)");
        }
      } else {
        const transaction = new Transaction({
          recentBlockhash: blockhash,
          feePayer: fromPubkey,
        }).add(instruction);

        const signedTx = await okoSvmWallet.signTransaction(transaction);
        const txSignature = signedTx.signature;

        if (txSignature) {
          setSignature(bs58.encode(txSignature));
        } else {
          setSignature("Transaction signed (no signature extracted)");
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTransaction = async () => {
    if (!okoSvmWallet || !publicKey) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSignature(null);

    try {
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(recipient);
      } catch {
        throw new Error("Invalid recipient address");
      }

      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
      if (lamports <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      const fromPubkey = new PublicKey(publicKey);
      const { blockhash } = await DEVNET_CONNECTION.getLatestBlockhash();

      const instruction = SystemProgram.transfer({
        fromPubkey,
        toPubkey: recipientPubkey,
        lamports,
      });

      let transaction: Transaction | VersionedTransaction;

      if (useVersioned) {
        const messageV0 = new TransactionMessage({
          payerKey: fromPubkey,
          recentBlockhash: blockhash,
          instructions: [instruction],
        }).compileToV0Message();

        transaction = new VersionedTransaction(messageV0);
      } else {
        transaction = new Transaction({
          recentBlockhash: blockhash,
          feePayer: fromPubkey,
        }).add(instruction);
      }

      const txSignature = await okoSvmWallet.sendTransaction(
        transaction,
        DEVNET_CONNECTION,
      );

      setSignature(txSignature);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-widget border border-widget-border rounded-3xl p-10 shadow-xl">
      <h3 className="text-2xl font-semibold tracking-tight mb-2">
        Send Transaction
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Create and sign a SOL transfer transaction (Devnet)
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
            placeholder="Enter Solana address..."
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
            Amount (SOL)
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

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={useVersioned}
            onChange={(e) => setUseVersioned(e.target.checked)}
            className="w-5 h-5 rounded border-widget-border bg-widget-field text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
          />
          <span className="text-sm text-gray-300">
            Use Versioned Transaction (V0)
          </span>
        </label>

        <div className="flex gap-4 mt-2">
          <Button
            onClick={handleSignTransaction}
            disabled={isLoading || !recipient}
            loading={isLoading}
            variant="ghost"
            size="lg"
            className="flex-1"
          >
            Sign Only
          </Button>
          <Button
            onClick={handleSendTransaction}
            disabled={isLoading || !recipient}
            loading={isLoading}
            size="lg"
            className="flex-1"
          >
            Sign & Send
          </Button>
        </div>
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
          {signature.length > 50 && (
            <Link
              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
              target="_blank"
              className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white underline underline-offset-4"
            >
              View on Solana Explorer
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
          )}
        </div>
      )}
    </div>
  );
}
