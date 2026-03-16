"use client";

import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { useState } from "react";

import { DEVNET_CONNECTION } from "@/lib/connection";
import { useSdkStore } from "@/store/sdk";
import Button from "./Button";

// Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

// Mock addresses for demo
const MOCK_TOKEN_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // USDC devnet
);
const MOCK_DEX_AUTHORITY = new PublicKey("11111111111111111111111111111112");

/**
 * Build a Token Program "Approve" instruction manually.
 * Layout: [1 (Approve discriminator), amount as u64 LE]
 */
function createApproveInstruction(
  tokenAccount: PublicKey,
  delegate: PublicKey,
  owner: PublicKey,
  amount: bigint,
): TransactionInstruction {
  const data = Buffer.alloc(9);
  data.writeUInt8(4, 0); // Approve instruction index
  data.writeBigUInt64LE(amount, 1);

  return new TransactionInstruction({
    keys: [
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: delegate, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_PROGRAM_ID,
    data,
  });
}

export function SwapDemoWidget() {
  const { okoSvmWallet, publicKey } = useSdkStore();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSwapDemo = async () => {
    if (!okoSvmWallet || !publicKey) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const fromPubkey = new PublicKey(publicKey);
      const { blockhash } = await DEVNET_CONNECTION.getLatestBlockhash();

      // Build a mock swap transaction with realistic instruction pattern
      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPubkey,
      });

      // 1. Compute Budget: Set compute unit limit
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));

      // 2. Compute Budget: Set compute unit price (priority fee)
      tx.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
      );

      // 3. Token Program: Approve (allow DEX to spend tokens)
      const mockTokenAccount = PublicKey.findProgramAddressSync(
        [
          fromPubkey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          MOCK_TOKEN_MINT.toBuffer(),
        ],
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
      )[0];

      tx.add(
        createApproveInstruction(
          mockTokenAccount,
          MOCK_DEX_AUTHORITY,
          fromPubkey,
          BigInt(1_000_000), // 1 USDC
        ),
      );

      // 4-6. Multiple transfers simulating swap internals
      for (let i = 0; i < 3; i++) {
        tx.add(
          new TransactionInstruction({
            keys: [
              { pubkey: fromPubkey, isSigner: true, isWritable: true },
              {
                pubkey: new PublicKey(
                  `1111111111111111111111111111111${i + 2}`,
                ),
                isSigner: false,
                isWritable: true,
              },
            ],
            programId: TOKEN_PROGRAM_ID,
            data: Buffer.from([3, ...new Array(8).fill(0)]), // Transfer instruction
          }),
        );
      }

      const signed = await okoSvmWallet.signTransaction(tx);
      const sig = Buffer.from(signed.signature!).toString("hex");
      setResult({ type: "success", message: `Signed: ${sig.slice(0, 40)}...` });
    } catch (error) {
      setResult({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
      <h2 className="text-lg font-semibold mb-1">Swap Demo</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Mock swap transaction with Token Approve + Compute Budget + Transfer
        instructions (7 messages)
      </p>

      <Button onClick={handleSwapDemo} disabled={isLoading}>
        {isLoading ? "Signing..." : "Sign Swap Transaction"}
      </Button>

      {result && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm break-all ${
            result.type === "success"
              ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
