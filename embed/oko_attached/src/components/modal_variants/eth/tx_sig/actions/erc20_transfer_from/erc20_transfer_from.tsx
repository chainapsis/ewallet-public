import type { FC } from "react";

import { AddressInfo } from "../common/address_info";
import { TokenInfo } from "../common/token_info";
import { TxContainer } from "../common/tx_container";
import type { ERC20TransferFromAction, RenderContext } from "../types";
import { TxRow } from "@oko-wallet-attached/components/modal_variants/common/tx_row";

export const ERC20TransferFrom: FC<ERC20TransferFromProps> = ({
  action,
  ctx,
}) => {
  return (
    <TxContainer>
      <TxRow label="Send">
        <TokenInfo
          tokenAddress={action.tokenAddress}
          amount={action.amount}
          chain={ctx?.chain}
          currency={action.currency}
        />
      </TxRow>
      <TxRow label="from">
        <AddressInfo address={action.from} />
      </TxRow>
      <TxRow label="to">
        <AddressInfo address={action.to} />
      </TxRow>
    </TxContainer>
  );
};

export interface ERC20TransferFromProps {
  action: ERC20TransferFromAction;
  ctx?: RenderContext;
}
