import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import type { FC } from "react";

import styles from "./actions.module.scss";
import { ERC20Approve } from "./erc20_approve/erc20_approve";
import { ERC20Permit } from "./erc20_permit/erc20_permit";
import { ERC20Transfer } from "./erc20_transfer/erc20_transfer";
import { ERC20TransferFrom } from "./erc20_transfer_from/erc20_transfer_from";
import { FallbackAction } from "./fallback/fallback_action";
import { NativeTransfer } from "./native_transfer/native_transfer";
import type { EthTxAction, RenderContext } from "./types";
import { Unknown } from "./unknown/unknown";

type TxRendererProps = {
  actions: EthTxAction[] | null;
  context?: RenderContext;
};

function renderAction(
  action: EthTxAction,
  index: number,
  ctx?: RenderContext,
): React.ReactNode {
  switch (action.kind) {
    case "native.transfer":
      return <NativeTransfer action={action} ctx={ctx} key={index} />;
    case "erc20.transfer":
      return <ERC20Transfer action={action} ctx={ctx} key={index} />;
    case "erc20.approve":
      return <ERC20Approve action={action} ctx={ctx} key={index} />;
    case "erc20.transferFrom":
      return <ERC20TransferFrom action={action} ctx={ctx} key={index} />;
    case "erc20.permit":
      return <ERC20Permit action={action} ctx={ctx} key={index} />;
    case "unknown":
      return <Unknown action={action} ctx={ctx} key={index} />;
    default:
      return <FallbackAction action={action} ctx={ctx} key={index} />;
  }
}

export const Actions: FC<TxRendererProps> = ({ actions, context }) => {
  if (context?.isLoading) {
    return <Skeleton width="100%" height="32px" />;
  }

  if (!actions) {
    return (
      <Unknown
        action={{ kind: "unknown", title: "Unknown transaction" }}
        ctx={context}
      />
    );
  }

  return (
    <div className={styles.txStack}>
      {actions.map((action, index) => renderAction(action, index, context))}
    </div>
  );
};
