import type { FC } from "react";
import { Typography } from "@oko-wallet/oko-common-ui/typography";

import type { ParsedInstruction } from "@oko-wallet-attached/tx-parsers/svm";
import { TxRow } from "@oko-wallet-attached/components/modal_variants/common/tx_row";
import styles from "../instructions.module.scss";

const STAKING_OP_LABELS: Record<string, string> = {
  deactivate: "Deactivate Stake",
  withdraw: "Withdraw Stake",
  authorize: "Authorize Stake",
  delegate: "Delegate Stake",
};

export function getStakingOperationLabel(instructionName: string): string {
  return STAKING_OP_LABELS[instructionName] ?? instructionName;
}

export interface StakingOperationInstructionProps {
  instruction: ParsedInstruction;
}

export const StakingOperationInstruction: FC<
  StakingOperationInstructionProps
> = ({ instruction }) => {
  const { instructionName, accounts } = instruction;
  const label = getStakingOperationLabel(instructionName);
  const stakeAccount = accounts[0]?.pubkey;

  return (
    <div className={styles.container}>
      <TxRow label="Action">
        <Typography color="secondary" size="lg" weight="semibold">
          {label}
        </Typography>
      </TxRow>
      {stakeAccount && (
        <TxRow label="Stake Account">
          <Typography
            color="secondary"
            size="sm"
            weight="medium"
            className={styles.address}
          >
            {stakeAccount}
          </Typography>
        </TxRow>
      )}
    </div>
  );
};
