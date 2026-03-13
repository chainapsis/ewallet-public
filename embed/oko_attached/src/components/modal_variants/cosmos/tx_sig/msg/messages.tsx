import { Bech32Address } from "@keplr-wallet/cosmos";
import type { MsgSend as ThorMsgSend } from "@keplr-wallet/proto-types/thorchain/v1/types/msg_send";
import type { Msg } from "@keplr-wallet/types";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import type { FC } from "react";

import styles from "./messages.module.scss";
import { SendMessagePretty } from "./send/send";
import { UnknownMessage } from "./unknown/unknown";
import type {
  SendMsg,
  UnpackedMsgForView,
} from "@oko-wallet-attached/types/cosmos_msg";

function renderAminoMessage(chainId: string, msg: Msg, index: number) {
  switch (msg.type) {
    case "cosmos-sdk/MsgSend":
    case "thorchain/MsgSend":
      return (
        <SendMessagePretty
          key={index}
          chainId={chainId}
          amount={msg.value.amount}
          toAddress={msg.value.to_address}
        />
      );
    default:
      return <UnknownMessage chainId={chainId} msg={msg} key={index} />;
  }
}

export function renderProtoMessage(
  chainId: string,
  msg: UnpackedMsgForView,
  index: number,
) {
  switch (msg.typeUrl) {
    case "/cosmos.bank.v1beta1.MsgSend": {
      const unpacked = msg.unpacked as SendMsg;
      return (
        <SendMessagePretty
          key={index}
          chainId={chainId}
          amount={unpacked.amount}
          toAddress={unpacked.to_address}
        />
      );
    }

    case "/types.MsgSend":
      return (
        <SendMessagePretty
          key={index}
          chainId={chainId}
          amount={(msg.unpacked as ThorMsgSend).amount}
          toAddress={new Bech32Address(
            (msg.unpacked as ThorMsgSend).toAddress,
          ).toBech32("thor")}
        />
      );

    default:
      return <UnknownMessage chainId={chainId} msg={msg} key={index} />;
  }
}

function renderMessage(
  chainId: string,
  msg: Msg | UnpackedMsgForView,
  index: number,
): React.ReactNode {
  if ("type" in msg) {
    return renderAminoMessage(chainId, msg, index);
  }

  if ("unpacked" in msg) {
    return renderProtoMessage(chainId, msg, index);
  }
}

export const Messages: FC<MessagesProps> = ({
  chainId,
  messages,
  isLoading,
}) => {
  if (isLoading) {
    return <Skeleton width="100%" height="32px" />;
  }

  return (
    <div className={styles.txRendererContainer}>
      {messages.map((msg, index) => renderMessage(chainId, msg, index))}
    </div>
  );
};

export interface MessagesProps {
  chainId: string;
  messages: readonly (Msg | UnpackedMsgForView)[];
  isLoading?: boolean;
}
