import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import type { EthereumEip712SignPayload } from "@oko-wallet/oko-sdk-core";
import type { FC } from "react";

import { EIP712Actions } from "./actions/actions";
import { useEIP712Action } from "./hooks/use_eip712_action";
import { MetadataContent } from "@oko-wallet-attached/components/modal_variants/common/metadata_content/metadata_content";

interface EthereumEip712SignatureContentProps {
  payload: EthereumEip712SignPayload;
}

export const EthereumEip712SignatureContent: FC<
  EthereumEip712SignatureContentProps
> = ({ payload }) => {
  const { action, evmChain } = useEIP712Action(payload);

  const isUnknownAction = action?.kind === "unknown";

  return (
    <div>
      <MetadataContent
        origin={payload.origin}
        chainInfo={payload.chain_info}
        signer={payload.signer}
      />
      <Spacing height={isUnknownAction ? 28 : 20} />
      {action ? <EIP712Actions action={action} chain={evmChain} /> : null}
    </div>
  );
};
