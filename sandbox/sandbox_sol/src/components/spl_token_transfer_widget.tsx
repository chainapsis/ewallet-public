"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";

import { useSdkStore } from "@/store/sdk";
import Button from "./Button";
import { DEVNET_CONNECTION } from "@/lib/connection";

// Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

// Well-known devnet tokens for testing
const DEVNET_TOKENS = [
  {
    name: "USDC (Devnet)",
    mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    decimals: 6,
  },
];

/**
 * Creates a transferChecked instruction manually (without @solana/spl-token dependency)
 */
function createTransferCheckedInstruction(
  source: PublicKey,
  mint: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: bigint,
  decimals: number,
): TransactionInstruction {
  // TransferChecked instruction discriminator = 12
  const data = Buffer.alloc(10);
  data.writeUInt8(12, 0); // instruction discriminator
  data.writeBigUInt64LE(amount, 1); // amount
  data.writeUInt8(decimals, 9); // decimals

  return new TransactionInstruction({
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_PROGRAM_ID,
    data,
  });
}

/**
 * Derives Associated Token Account address
 */
function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
): PublicKey {
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  );

  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  return address;
}

export function SplTokenTransferWidget() {
  const { okoSvmWallet, publicKey } = useSdkStore();
  const [selectedToken, setSelectedToken] = useState(DEVNET_TOKENS[0]);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1");
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignTransaction = async () => {
    if (!okoSvmWallet || !publicKey) return;

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

      const tokenAmount = BigInt(
        Math.floor(parseFloat(amount) * Math.pow(10, selectedToken.decimals)),
      );
      if (tokenAmount <= BigInt(0)) {
        throw new Error("Amount must be greater than 0");
      }

      const ownerPubkey = new PublicKey(publicKey);
      const mintPubkey = new PublicKey(selectedToken.mint);

      // Derive token accounts
      const sourceAta = getAssociatedTokenAddress(mintPubkey, ownerPubkey);
      const destinationAta = getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey,
      );

      const { blockhash } = await DEVNET_CONNECTION.getLatestBlockhash();

      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: ownerPubkey,
      }).add(
        createTransferCheckedInstruction(
          sourceAta,
          mintPubkey,
          destinationAta,
          ownerPubkey,
          tokenAmount,
          selectedToken.decimals,
        ),
      );

      const signedTx = await okoSvmWallet.signTransaction(transaction);
      const txSignature = signedTx.signature;

      if (txSignature) {
        setSignature(bs58.encode(txSignature));
      } else {
        setSignature("Transaction signed (no signature extracted)");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTransaction = async () => {
    if (!okoSvmWallet || !publicKey) return;

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

      const tokenAmount = BigInt(
        Math.floor(parseFloat(amount) * Math.pow(10, selectedToken.decimals)),
      );
      if (tokenAmount <= BigInt(0)) {
        throw new Error("Amount must be greater than 0");
      }

      const ownerPubkey = new PublicKey(publicKey);
      const mintPubkey = new PublicKey(selectedToken.mint);

      const sourceAta = getAssociatedTokenAddress(mintPubkey, ownerPubkey);
      const destinationAta = getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey,
      );

      const { blockhash } = await DEVNET_CONNECTION.getLatestBlockhash();

      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: ownerPubkey,
      }).add(
        createTransferCheckedInstruction(
          sourceAta,
          mintPubkey,
          destinationAta,
          ownerPubkey,
          tokenAmount,
          selectedToken.decimals,
        ),
      );

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
        SPL Token Transfer
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Test SPL token transferChecked instruction (Devnet)
      </p>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
            Token
          </label>
          <select
            className="w-full bg-widget-field border border-widget-border rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-widget-border-hover focus:ring-2 focus:ring-widget-border-hover transition-all"
            value={selectedToken.mint}
            onChange={(e) => {
              const token = DEVNET_TOKENS.find(
                (t) => t.mint === e.target.value,
              );
              if (token) setSelectedToken(token);
            }}
          >
            {DEVNET_TOKENS.map((token) => (
              <option key={token.mint} value={token.mint}>
                {token.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 font-mono break-all">
            Mint: {selectedToken.mint}
          </p>
        </div>

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
            Amount
          </label>
          <input
            type="number"
            className="w-full bg-widget-field border border-widget-border rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-widget-border-hover focus:ring-2 focus:ring-widget-border-hover transition-all"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1"
            step="0.000001"
            min="0"
          />
        </div>

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
