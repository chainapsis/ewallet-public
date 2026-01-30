import type { Msg } from "@keplr-wallet/types";
import type { Any } from "@keplr-wallet/proto-types/google/protobuf/any";
import type { AminoMsg } from "@cosmjs/amino";
import type { ParsedInstruction } from "@oko-wallet-attached/tx-parsers/svm";

import type { EthTxAction } from "@oko-wallet-attached/components/modal_variants/eth/tx_sig/actions/types";
import type { UnpackedMsgForView } from "@oko-wallet-attached/types/cosmos_msg";

export type TxType = string;

export type ChainType = "eth" | "cosmos" | "svm";

export type CosmosMsgs =
  | Any[]
  | readonly AminoMsg[]
  | readonly Msg[]
  | UnpackedMsgForView[];

export type ActionsOrMessages = EthTxAction[] | CosmosMsgs;

export type UseTrackTxSummaryViewArgs =
  | {
      hostOrigin: string;
      chainType: "cosmos";
      chainId: string;
      messages: readonly Msg[] | UnpackedMsgForView[];
    }
  | {
      hostOrigin: string;
      chainType: "eth";
      chainId: string;
      actions: EthTxAction[] | null;
    };

export type TrackTxButtonEventArgs =
  | {
      eventType: "approve" | "reject";
      hostOrigin: string;
      chainType: "cosmos";
      chainId: string;
      messages: CosmosMsgs;
    }
  | {
      eventType: "approve" | "reject";
      hostOrigin: string;
      chainType: "eth";
      chainId: string;
      actions: EthTxAction[];
    }
  | {
      eventType: "approve" | "reject";
      hostOrigin: string;
      chainType: "svm";
      instructions: ParsedInstruction[] | null;
    };
