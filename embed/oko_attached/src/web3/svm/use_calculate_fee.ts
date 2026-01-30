import { useMemo } from "react";
import {
  VersionedTransaction,
  Transaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";

import { base64ToUint8Array } from "@oko-wallet-attached/utils/base64";

const LAMPORTS_PER_SIGNATURE = 5000;
const DEFAULT_COMPUTE_UNITS = 200_000;
const COMPUTE_BUDGET_PROGRAM_ID = ComputeBudgetProgram.programId.toBase58();

interface PriorityFeeInfo {
  computeUnits: number;
  microLamportsPerUnit: number;
}

function parsePriorityFee(
  instructions: { programId: string; data: Uint8Array }[],
): PriorityFeeInfo {
  let computeUnits = DEFAULT_COMPUTE_UNITS;
  let microLamportsPerUnit = 0;

  for (const ix of instructions) {
    if (ix.programId !== COMPUTE_BUDGET_PROGRAM_ID) continue;

    const data = ix.data;
    if (data.length === 0) continue;

    const instructionType = data[0];

    // SetComputeUnitLimit = 2
    if (instructionType === 2 && data.length >= 5) {
      computeUnits = new DataView(
        data.buffer,
        data.byteOffset + 1,
        4,
      ).getUint32(0, true);
    }

    // SetComputeUnitPrice = 3
    if (instructionType === 3 && data.length >= 9) {
      microLamportsPerUnit = Number(
        new DataView(data.buffer, data.byteOffset + 1, 8).getBigUint64(0, true),
      );
    }
  }

  return { computeUnits, microLamportsPerUnit };
}

export interface UseCalculateFeeProps {
  serializedTransaction: string;
  isVersioned: boolean;
}

export interface UseCalculateFeeResult {
  fee: number | null;
}

export function useCalculateFee({
  serializedTransaction,
  isVersioned,
}: UseCalculateFeeProps): UseCalculateFeeResult {
  const fee = useMemo(() => {
    if (!serializedTransaction) {
      return null;
    }

    try {
      const txBytes = base64ToUint8Array(serializedTransaction);

      let numSignatures: number;
      let priorityFeeInfo: PriorityFeeInfo;

      if (isVersioned) {
        const transaction = VersionedTransaction.deserialize(txBytes);
        const message = transaction.message;

        numSignatures = message.header.numRequiredSignatures;

        const accountKeys = message.staticAccountKeys.map((k) => k.toBase58());
        const instructions = message.compiledInstructions.map((ix) => ({
          programId: accountKeys[ix.programIdIndex],
          data: ix.data,
        }));
        priorityFeeInfo = parsePriorityFee(instructions);
      } else {
        const transaction = Transaction.from(txBytes);
        const message = transaction.compileMessage();

        numSignatures = message.header.numRequiredSignatures;

        const instructions = transaction.instructions.map((ix) => ({
          programId: ix.programId.toBase58(),
          data: ix.data,
        }));
        priorityFeeInfo = parsePriorityFee(instructions);
      }

      // Base fee: 5000 lamports per signature
      const baseFee = numSignatures * LAMPORTS_PER_SIGNATURE;

      // Priority fee: microLamports × computeUnits / 1_000_000
      const priorityFee = Math.floor(
        (priorityFeeInfo.microLamportsPerUnit * priorityFeeInfo.computeUnits) /
          1_000_000,
      );

      return baseFee + priorityFee;
    } catch {
      return null;
    }
  }, [serializedTransaction, isVersioned]);

  return { fee };
}
