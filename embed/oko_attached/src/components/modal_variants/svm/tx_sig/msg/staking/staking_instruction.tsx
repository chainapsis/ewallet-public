import { ChevronDownIcon } from "@oko-wallet/oko-common-ui/icons/chevron_down";
import { InfoCircleIcon } from "@oko-wallet/oko-common-ui/icons/info_circle";
import { Tooltip } from "@oko-wallet/oko-common-ui/tooltip";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useState } from "react";

import styles from "./staking_instruction.module.scss";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { SOLANA_LOGO_URL } from "@oko-wallet-attached/constants/urls";
import type { ParsedInstruction } from "@oko-wallet-attached/tx-parsers/svm";

const STAKE_ACCOUNT_RENT_LAMPORTS = 2_282_880; // ~0.00228288 SOL

export interface StakedData {
  stakeAmount: bigint | number;
  rentAmount: bigint | number;
  totalAmount: bigint | number;
}

function formatLamports(lamports: bigint | number): string {
  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 9,
  });
  return formatter.format(`${lamports}E-9` as unknown as number);
}

export function extractStakingData(
  instruction: ParsedInstruction,
): StakedData | null {
  const { programId, instructionName, data } = instruction;

  // System Program - createAccount for Stake Program
  if (
    programId === "11111111111111111111111111111111" &&
    instructionName === "createAccount" &&
    data.owner === "Stake11111111111111111111111111111111111111"
  ) {
    const lamports = data.lamports as bigint | number | undefined;
    if (lamports !== undefined) {
      const stakeAmount =
        BigInt(lamports) - BigInt(STAKE_ACCOUNT_RENT_LAMPORTS);
      return {
        stakeAmount: stakeAmount > 0 ? stakeAmount : BigInt(0),
        rentAmount: STAKE_ACCOUNT_RENT_LAMPORTS,
        totalAmount: lamports,
      };
    }
  }

  // Native Stake Program
  if (programId === "Stake11111111111111111111111111111111111111") {
    // For delegate, the stake amount comes from the stake account balance
    // which is typically created via a system transfer beforehand
    const lamports = data.lamports as bigint | number | undefined;
    if (lamports !== undefined) {
      const stakeAmount =
        BigInt(lamports) - BigInt(STAKE_ACCOUNT_RENT_LAMPORTS);
      return {
        stakeAmount: stakeAmount > 0 ? stakeAmount : BigInt(0),
        rentAmount: STAKE_ACCOUNT_RENT_LAMPORTS,
        totalAmount: lamports,
      };
    }
  }

  // SPL Stake Pool
  if (programId === "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy") {
    const lamports = data.lamports as bigint | number | undefined;
    if (lamports !== undefined) {
      return {
        stakeAmount: lamports,
        rentAmount: 0,
        totalAmount: lamports,
      };
    }
  }

  // Marinade Liquid Staking
  if (programId === "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD") {
    const lamports = data.lamports as bigint | number | undefined;
    if (lamports !== undefined) {
      return {
        stakeAmount: lamports,
        rentAmount: 0,
        totalAmount: lamports,
      };
    }
  }

  // Marinade Native Staking
  if (programId === "mnspJQyF1KdDEs5c6YJPocYdY1esBgVQFufM2dY9oDk") {
    const lamports = data.lamports as bigint | number | undefined;
    if (lamports !== undefined) {
      return {
        stakeAmount: lamports,
        rentAmount: 0,
        totalAmount: lamports,
      };
    }
  }

  // Jito Stake Deposit Interceptor
  if (programId === "5TAiuAh3YGDbwjEruC1ZpXTJWdNDS7Ur7VeqNNiHMmGV") {
    const lamports = data.lamports as bigint | number | undefined;
    if (lamports !== undefined) {
      return {
        stakeAmount: lamports,
        rentAmount: 0,
        totalAmount: lamports,
      };
    }
  }

  return null;
}

export interface StakingInstructionProps {
  instruction: ParsedInstruction;
}

export const StakingInstruction: FC<StakingInstructionProps> = ({
  instruction,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const stakingData = extractStakingData(instruction);
  if (!stakingData) {
    return null;
  }

  const { stakeAmount, rentAmount, totalAmount } = stakingData;
  const hasRent = Number(rentAmount) > 0;

  function handleToggle() {
    if (hasRent) {
      setIsExpanded((prev) => !prev);
    }
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.header}
        onClick={handleToggle}
        disabled={!hasRent}
      >
        <div className={styles.headerContent}>
          <Typography color="tertiary" size="xs" weight="medium">
            Amount to Lock
          </Typography>
          <div className={styles.totalAmount}>
            <Avatar
              src={SOLANA_LOGO_URL}
              alt="SOL"
              size="sm"
              variant="rounded"
            />
            <Typography color="secondary" size="lg" weight="semibold">
              {formatLamports(totalAmount)} SOL
            </Typography>
          </div>
        </div>
        {hasRent && (
          <ChevronDownIcon
            className={`${styles.chevronIcon} ${isExpanded ? styles.chevronIconExpanded : ""}`}
            color="var(--fg-quaternary)"
          />
        )}
      </button>

      {isExpanded && hasRent && (
        <div className={styles.details}>
          <div className={styles.divider} />

          <div className={styles.row}>
            <Typography
              color="secondary"
              size="xs"
              weight="semibold"
              className={styles.rowLabel}
            >
              Stake
            </Typography>
            <div className={styles.rowValue}>
              <Avatar
                src={SOLANA_LOGO_URL}
                alt="SOL"
                size="sm"
                variant="rounded"
              />
              <Typography color="tertiary" size="sm" weight="medium">
                {formatLamports(stakeAmount)} SOL
              </Typography>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <Typography color="secondary" size="xs" weight="semibold">
                Rent
              </Typography>
              <Tooltip
                content="A small SOL deposit, returned when you unstake."
                placement="top"
              >
                <InfoCircleIcon
                  className={styles.infoIcon}
                  color="var(--fg-quaternary)"
                />
              </Tooltip>
            </div>
            <div className={styles.rowValue}>
              <Avatar
                src={SOLANA_LOGO_URL}
                alt="SOL"
                size="sm"
                variant="rounded"
              />
              <Typography color="tertiary" size="sm" weight="medium">
                {formatLamports(rentAmount)} SOL
              </Typography>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
