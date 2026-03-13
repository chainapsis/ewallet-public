import type { FC } from "react";

import { AddressInfo } from "../common/address_info";
import { TokenInfo } from "../common/token_info";
import { TxContainer } from "../common/tx_container";
import type { ERC20PermitAction, RenderContext } from "../types";
import { TxRow } from "@oko-wallet-attached/components/modal_variants/common/tx_row";

export const ERC20Permit: FC<ERC20PermitProps> = ({ action, ctx }) => {
  return (
    <TxContainer>
      <TxRow label="Permit to use up to">
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
      <TxRow label="owner">
        <AddressInfo address={action.owner} />
      </TxRow>
    </TxContainer>
  );
};

export interface ERC20PermitProps {
  action: ERC20PermitAction;
  ctx?: RenderContext;
}
