import type { FC } from "react";
import type { ParsedInstruction } from "@oko-wallet-attached/tx-parsers/svm";

import styles from "../instructions.module.scss";
import { MakeSignatureRawCodeBlock } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block";

export interface UnknownInstructionProps {
  instruction: ParsedInstruction;
}

export const UnknownInstruction: FC<UnknownInstructionProps> = ({
  instruction,
}) => {
  const jsonData = JSON.stringify(instruction, null, 2);

  return (
    <div className={styles.container}>
      <MakeSignatureRawCodeBlock code={jsonData} />
    </div>
  );
};
