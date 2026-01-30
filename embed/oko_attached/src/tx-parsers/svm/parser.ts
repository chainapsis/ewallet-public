import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { parseInstruction } from "./instruction";
import type {
  ParsedTransaction,
  ParsedInstruction,
  ParseResult,
} from "./types";
import bs58 from "bs58";

export async function parseTransaction(
  transaction: Transaction | VersionedTransaction,
): Promise<ParseResult<ParsedTransaction>> {
  try {
    if (transaction instanceof Transaction) {
      return await parseLegacyTransaction(transaction);
    } else {
      return await parseVersionedTransaction(transaction);
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse transaction: ${error}`,
    };
  }
}

async function parseLegacyTransaction(
  transaction: Transaction,
): Promise<ParseResult<ParsedTransaction>> {
  const instructions: ParsedInstruction[] = [];

  for (const ix of transaction.instructions) {
    const accounts = ix.keys.map((key) => ({
      pubkey: key.pubkey.toBase58(),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    }));

    const result = await parseInstruction(
      ix.programId.toBase58(),
      bs58.encode(ix.data),
      accounts,
    );

    if (result.success) {
      instructions.push(result.data);
    }
  }

  return {
    success: true,
    data: {
      instructions,
      feePayer: transaction.feePayer?.toBase58() ?? null,
      recentBlockhash: transaction.recentBlockhash ?? null,
    },
  };
}

async function parseVersionedTransaction(
  transaction: VersionedTransaction,
): Promise<ParseResult<ParsedTransaction>> {
  const message = transaction.message;
  const instructions: ParsedInstruction[] = [];
  const accountKeys = message.staticAccountKeys;

  for (const ix of message.compiledInstructions) {
    const programId = accountKeys[ix.programIdIndex].toBase58();

    const accounts = ix.accountKeyIndexes.map((idx) => ({
      pubkey: accountKeys[idx].toBase58(),
      isSigner: message.isAccountSigner(idx),
      isWritable: message.isAccountWritable(idx),
    }));

    const result = await parseInstruction(
      programId,
      bs58.encode(ix.data),
      accounts,
    );

    if (result.success) {
      instructions.push(result.data);
    }
  }

  return {
    success: true,
    data: {
      instructions,
      feePayer: accountKeys[0]?.toBase58() ?? null,
      recentBlockhash: message.recentBlockhash ?? null,
    },
  };
}

export function deserializeTransaction(
  serialized: Uint8Array | Buffer,
): ParseResult<Transaction | VersionedTransaction> {
  try {
    const buffer = Buffer.from(serialized);

    try {
      const versionedTx = VersionedTransaction.deserialize(buffer);
      return { success: true, data: versionedTx };
    } catch {
      const legacyTx = Transaction.from(buffer);
      return { success: true, data: legacyTx };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to deserialize transaction: ${error}`,
    };
  }
}
