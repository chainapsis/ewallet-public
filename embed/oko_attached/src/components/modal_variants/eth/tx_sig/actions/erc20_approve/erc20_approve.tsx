import type { FC } from "react";

import { AddressInfo } from "../common/address_info";
import { TokenInfo } from "../common/token_info";
import { TxContainer } from "../common/tx_container";
import type { ERC20ApproveAction, RenderContext } from "../types";
import { TxRow } from "@oko-wallet-attached/components/modal_variants/common/tx_row";

export const ERC20Approve: FC<ERC20ApproveProps> = ({ action, ctx }) => {
  return (
    <TxContainer>
      <TxRow label="Approve">
        <TokenInfo
          tokenAddress={action.tokenAddress}
          amount={action.amount}
          chain={ctx?.chain}
          currency={action.currency}
        />
      </TxRow>
      <TxRow label="spender">
        <AddressInfo address={action.to} />
      </TxRow>
    </TxContainer>
  );
};

export interface ERC20ApproveProps {
  action: ERC20ApproveAction;
  ctx?: RenderContext;
}
