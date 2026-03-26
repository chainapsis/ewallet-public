import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import type { FC, ReactNode } from "react";

import styles from "./instructions.module.scss";
import { isStakingProgram } from "./staking/constants";
import {
  extractStakingData,
  StakingInstruction,
} from "./staking/staking_instruction";
import {
  getStakingOperationLabel,
  StakingOperationInstruction,
} from "./staking/staking_operation_instruction";
import { TokenTransferPretty } from "./transfer/token_transfer";
import { SvmTransferPretty } from "./transfer/transfer";
import { UnknownInstruction } from "./unknown/unknown";
import { Collapsible } from "@oko-wallet-attached/components/collapsible/collapsible";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import {
  type ParsedInstruction,
  SYSTEM_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@oko-wallet-attached/tx-parsers/svm";

function isTokenProgram(programId: string): boolean {
  return programId === TOKEN_PROGRAM_ID || programId === TOKEN_2022_PROGRAM_ID;
}

function getInstructionTitle(instruction: ParsedInstruction): string {
  const { programId, instructionName } = instruction;

  if (extractStakingData(instruction) !== null) {
    return "Staking";
  }

  if (isStakingProgram(programId)) {
    return getStakingOperationLabel(instructionName);
  }

  if (programId === SYSTEM_PROGRAM_ID && instructionName === "transfer") {
    return "Token Transfer";
  }

  if (
    isTokenProgram(programId) &&
    (instructionName === "transferChecked" || instructionName === "transfer")
  ) {
    return "Token Transfer";
  }

  return instructionName || "Unknown";
}

function renderInstruction(
  instruction: ParsedInstruction,
  index: number,
  chainId: string,
  isMobileNative: boolean,
  embedded = false,
): ReactNode {
  const { programId, instructionName, data, accounts } = instruction;
  const embeddedTokenTransfer = embedded && isMobileNative;

  // Staking instruction (check first, includes System Program createAccount for Stake)
  if (extractStakingData(instruction) !== null) {
    return <StakingInstruction key={index} instruction={instruction} />;
  }

  // Staking Programs without amount data -> show operation details
  if (isStakingProgram(programId)) {
    return (
      <StakingOperationInstruction key={index} instruction={instruction} />
    );
  }

  // System Program - SOL Transfer
  if (programId === SYSTEM_PROGRAM_ID && instructionName === "transfer") {
    const lamports = data.lamports as bigint | number | undefined;
    const to = accounts[1]?.pubkey;

    if (lamports !== undefined) {
      return (
        <SvmTransferPretty
          key={index}
          lamports={lamports}
          to={to}
          embedded={embedded}
          mobileNative={isMobileNative}
        />
      );
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
            chainId={chainId}
            embedded={embeddedTokenTransfer}
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
            chainId={chainId}
            embedded={embeddedTokenTransfer}
          />
        );
      }
    }
  }

  // Default: Unknown instruction
  return (
    <UnknownInstruction
      key={index}
      instruction={instruction}
      embedded={embedded}
    />
  );
}

export interface InstructionsProps {
  instructions: ParsedInstruction[];
  chainId: string;
  isLoading?: boolean;
}

export const Instructions: FC<InstructionsProps> = ({
  instructions,
  chainId,
  isLoading,
}) => {
  const isMobileNative = useMemoryState((state) => state.isMobileNative);

  if (isLoading) {
    return <Skeleton width="100%" height="32px" />;
  }

  // When a staking instruction with amount data exists (e.g., createAccount),
  // hide auxiliary staking instructions (initialize, delegateStake) since they
  // are implementation details already represented in the "Amount to Lock" card.
  const hasStakingData = instructions.some(
    (ix) => extractStakingData(ix) !== null,
  );

  const validInstructions = instructions.filter(
    (ix) =>
      !(
        hasStakingData &&
        isStakingProgram(ix.programId) &&
        extractStakingData(ix) === null
      ),
  );

  // Single instruction: render directly without collapsible
  if (validInstructions.length === 1) {
    return (
      <div className={styles.instructionsContainer}>
        {renderInstruction(
          validInstructions[0],
          0,
          chainId,
          isMobileNative,
          false,
        )}
      </div>
    );
  }

  // Multiple instructions: render each in a collapsible
  return (
    <div className={styles.instructionsContainer}>
      {validInstructions.map((instruction, index) => (
        <Collapsible
          // biome-ignore lint/suspicious/noArrayIndexKey: instruction list display only
          key={index}
          title={getInstructionTitle(instruction)}
          defaultExpanded={false}
          className={styles.multiInstructionRow}
        >
          {renderInstruction(instruction, index, chainId, isMobileNative, true)}
        </Collapsible>
      ))}
    </div>
  );
};
