import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, Fragment } from "react";
import { stringify, type TypedDataDefinition } from "viem";

import { MakeSignatureRawCodeBlock } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block";
import { MakeSignatureRawCodeBlockContainer } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block_container";

export interface UnknownActionProps {
  typedData: TypedDataDefinition;
}

export const UnknownAction: FC<UnknownActionProps> = ({ typedData }) => {
  return (
    <Fragment>
      <Typography color="tertiary" size="sm" weight="semibold">
        EIP-712 Typed Data
      </Typography>
      <Spacing height={8} />
      <MakeSignatureRawCodeBlockContainer>
        <MakeSignatureRawCodeBlock code={stringify(typedData, null, 2)} />
      </MakeSignatureRawCodeBlockContainer>
    </Fragment>
  );
};
