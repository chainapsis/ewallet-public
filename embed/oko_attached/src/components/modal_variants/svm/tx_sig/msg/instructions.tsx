import type { FC, ReactNode } from "react";
import {
  type ParsedInstruction,
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@oko-wallet-attached/tx-parsers/svm";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";

import styles from "./instructions.module.scss";
import { isStakingProgram } from "./staking/constants";
import {
  extractStakingData,
  StakingInstruction,
} from "./staking/staking_instruction";
import { TokenTransferPretty } from "./transfer/token_transfer";
import { SvmTransferPretty } from "./transfer/transfer";
import { UnknownInstruction } from "./unknown/unknown";
import { Collapsible } from "@oko-wallet-attached/components/collapsible/collapsible";

function isTokenProgram(programId: string): boolean {
  return programId === TOKEN_PROGRAM_ID || programId === TOKEN_2022_PROGRAM_ID;
}

function getInstructionTitle(instruction: ParsedInstruction): string {
  const { programId, instructionName } = instruction;

  if (extractStakingData(instruction) !== null) {
    return "Staking";
  }

  if (programId === SYSTEM_PROGRAM_ID && instructionName === "transfer") {
    return "Token Transfer";
  }

  if (isTokenProgram(programId)) {
    if (
      instructionName === "transferChecked" ||
      instructionName === "transfer"
    ) {
      return "Token Transfer";
    }
  }

  return instructionName || "Unknown";
}

function renderInstruction(
  instruction: ParsedInstruction,
  index: number,
  chainIdentifier: string,
): ReactNode {
  const { programId, instructionName, data, accounts } = instruction;

  // Staking instruction (check first, includes System Program createAccount for Stake)
  if (extractStakingData(instruction) !== null) {
    return <StakingInstruction key={index} instruction={instruction} />;
  }

  // Staking Programs without amount data -> skip (return null)
  if (isStakingProgram(programId)) {
    return null;
  }

  // System Program - SOL Transfer
  if (programId === SYSTEM_PROGRAM_ID && instructionName === "transfer") {
    const lamports = data.lamports as bigint | number | undefined;
    const to = accounts[1]?.pubkey;

    if (lamports !== undefined) {
      return <SvmTransferPretty key={index} lamports={lamports} to={to} />;
    }
  }

  // Token Program - Token Transfer
  if (isTokenProgram(programId)) {
    // transferChecked: source, mint, destination, owner
    if (instructionName === "transferChecked") {
      const amount = data.amount as bigint | number | undefined;
      const decimals = data.decimals as number | undefined;
      const mint = accounts[1]?.pubkey;
      const to = accounts[2]?.pubkey;

      if (amount !== undefined) {
        return (
          <TokenTransferPretty
            key={index}
            amount={amount}
            decimals={decimals}
            mint={mint}
            to={to}
            chainIdentifier={chainIdentifier}
          />
        );
      }
    }

    // transfer: source, destination, owner (no mint in accounts)
    if (instructionName === "transfer") {
      const amount = data.amount as bigint | number | undefined;
      const to = accounts[1]?.pubkey;

      if (amount !== undefined) {
        return (
          <TokenTransferPretty
            key={index}
            amount={amount}
            to={to}
            chainIdentifier={chainIdentifier}
          />
        );
      }
    }

    return <UnknownInstruction key={index} instruction={instruction} />;
  }

  // Default: Unknown instruction
  return <UnknownInstruction key={index} instruction={instruction} />;
}

export interface InstructionsProps {
  instructions: ParsedInstruction[];
  chainIdentifier: string;
  isLoading?: boolean;
}

export const Instructions: FC<InstructionsProps> = ({
  instructions,
  chainIdentifier,
  isLoading,
}) => {
  if (isLoading) {
    return <Skeleton width="100%" height="32px" />;
  }

  // Filter out null results from renderInstruction (e.g., staking programs without amount)
  const validInstructions = instructions.filter(
    (ix, index) => renderInstruction(ix, index, chainIdentifier) !== null,
  );

  // Single instruction: render directly without collapsible
  if (validInstructions.length === 1) {
    return (
      <div className={styles.instructionsContainer}>
        {renderInstruction(validInstructions[0], 0, chainIdentifier)}
      </div>
    );
  }

  // Multiple instructions: render each in a collapsible
  return (
    <div className={styles.instructionsContainer}>
      {validInstructions.map((instruction, index) => (
        <Collapsible
          key={index}
          title={getInstructionTitle(instruction)}
          defaultExpanded={index === 0}
        >
          {renderInstruction(instruction, index, chainIdentifier)}
        </Collapsible>
      ))}
    </div>
  );
};
