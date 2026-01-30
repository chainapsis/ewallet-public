import {
  SolanaFMParser,
  ParserType,
  type InstructionParserInterface,
} from "@solanafm/explorer-kit";
import { getProgramIdl } from "@solanafm/explorer-kit-idls";
import type { ParsedInstruction, ParsedAccount, ParseResult } from "./types";

const parserCache = new Map<string, InstructionParserInterface | null>();

// Well-known Solana program IDs
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const KNOWN_PROGRAMS: Record<string, string> = {
  [SYSTEM_PROGRAM_ID]: "System Program",
  [TOKEN_PROGRAM_ID]: "Token Program",
  [TOKEN_2022_PROGRAM_ID]: "Token-2022",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: "Associated Token Program",
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter v6",
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "Orca Whirlpool",
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin": "Serum DEX v3",
};

async function getParserForProgram(
  programId: string,
): Promise<InstructionParserInterface | null> {
  if (parserCache.has(programId)) {
    return parserCache.get(programId) ?? null;
  }

  try {
    const idl = await getProgramIdl(programId);
    if (!idl) {
      parserCache.set(programId, null);
      return null;
    }

    const parser = new SolanaFMParser(idl, programId);
    const instructionParser = parser.createParser(ParserType.INSTRUCTION);

    if (instructionParser && "parseInstructions" in instructionParser) {
      parserCache.set(
        programId,
        instructionParser as InstructionParserInterface,
      );
      return instructionParser as InstructionParserInterface;
    }
  } catch {
    parserCache.set(programId, null);
  }

  return null;
}

export async function parseInstruction(
  programId: string,
  instructionData: string,
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[],
): Promise<ParseResult<ParsedInstruction>> {
  const programName = KNOWN_PROGRAMS[programId] ?? "Unknown Program";

  const parser = await getParserForProgram(programId);

  if (!parser) {
    return {
      success: true,
      data: {
        programId,
        programName,
        instructionName: "Unknown",
        data: { raw: instructionData },
        accounts: accounts.map((acc) => ({
          pubkey: acc.pubkey,
          isSigner: acc.isSigner,
          isWritable: acc.isWritable,
        })),
      },
    };
  }

  try {
    const parsed = parser.parseInstructions(instructionData);

    if (!parsed) {
      return {
        success: true,
        data: {
          programId,
          programName,
          instructionName: "Unknown",
          data: { raw: instructionData },
          accounts: accounts.map((acc) => ({
            pubkey: acc.pubkey,
            isSigner: acc.isSigner,
            isWritable: acc.isWritable,
          })),
        },
      };
    }

    const parsedAccounts: ParsedAccount[] = accounts.map((acc) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    }));

    return {
      success: true,
      data: {
        programId,
        programName,
        instructionName: parsed.name ?? "Unknown",
        data: parsed.data ?? {},
        accounts: parsedAccounts,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse instruction: ${error}`,
    };
  }
}
