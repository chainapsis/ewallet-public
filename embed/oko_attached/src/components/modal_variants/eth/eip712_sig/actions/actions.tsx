import type { FC } from "react";
import { type Chain, maxUint256 } from "viem";

import { PermitAction } from "./permit/permit_action";
import type { EIP712Action } from "./types";
import { UnknownAction } from "./unknown/unknown";

export type EIP712ActionsProps = {
  action: EIP712Action;
  chain: Chain;
};

export const EIP712Actions: FC<EIP712ActionsProps> = ({ action, chain }) => {
  switch (action.kind) {
    case "erc2612.permit":
      return (
        <PermitAction
          spender={action.spender}
          tokenAddress={action.domain.verifyingContract}
          amount={action.amount}
          typedData={action.typedData}
          chain={chain}
          tokenLogoURI={action.tokenLogoURI}
        />
      );
    case "dai.permit":
      return (
        <PermitAction
          spender={action.spender}
          tokenAddress={action.domain.verifyingContract}
          amount={action.allowed ? maxUint256 : BigInt(0)}
          typedData={action.typedData}
          chain={chain}
          tokenLogoURI={action.tokenLogoURI}
        />
      );
    case "uniswap.permitSingle":
      return (
        <PermitAction
          spender={action.spender}
          tokenAddress={action.details.token}
          amount={action.details.amount}
          typedData={action.typedData}
          chain={chain}
          tokenLogoURI={action.tokenLogoURI}
        />
      );
    case "unknown":
      return <UnknownAction typedData={action.typedData} />;
    default:
      throw new Error(`Unknown action kind: ${(action as any).kind}`);
  }
};
