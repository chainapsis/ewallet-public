export interface ParsedInstruction {
  programId: string;
  programName: string;
  instructionName: string;
  data: Record<string, unknown>;
  accounts: ParsedAccount[];
}

export interface ParsedAccount {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
  name?: string;
}

export interface ParsedTransaction {
  instructions: ParsedInstruction[];
  feePayer: string | null;
  recentBlockhash: string | null;
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
