import type { FC } from "react";

import styles from "../instructions.module.scss";
import { MakeSignatureRawCodeBlock } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block";
import { MakeSignatureRawCodeBlockContainer } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block_container";
import type { ParsedInstruction } from "@oko-wallet-attached/tx-parsers/svm";

export interface UnknownInstructionProps {
  instruction: ParsedInstruction;
  embedded?: boolean;
}

export const UnknownInstruction: FC<UnknownInstructionProps> = ({
  instruction,
  embedded = false,
}) => {
  const jsonData = JSON.stringify(instruction, null, 2);

  return (
    <MakeSignatureRawCodeBlockContainer
      variant={embedded ? "embedded" : "top-level"}
      className={styles.unknownSurface}
    >
      <MakeSignatureRawCodeBlock
        code={jsonData}
        variant={embedded ? "embedded" : "top-level"}
      />
    </MakeSignatureRawCodeBlockContainer>
  );
};
