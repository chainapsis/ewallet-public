import { useEffect, useRef } from "react";
import type { ParsedInstruction } from "@oko-wallet-attached/tx-parsers/svm";

import type { EthTxAction } from "@oko-wallet-attached/components/modal_variants/eth/tx_sig/actions/types";
import { trackEvent } from "./amplitude";
import type {
  CosmosMsgs,
  TrackTxButtonEventArgs,
  UseTrackTxSummaryViewArgs,
} from "./types";

export function useTrackTxSummaryView(args: UseTrackTxSummaryViewArgs) {
  const { hostOrigin, chainType, chainId } = args;
  const hasTrackedRef = useRef(false);

  let txTypes;
  switch (chainType) {
    case "cosmos": {
      const { messages } = args;
      txTypes = classifyCosmosTxType(messages);
      break;
    }

    case "eth": {
      const { actions } = args;
      txTypes = classifyEthTxType(actions);
      break;
    }
  }

  useEffect(() => {
    if (hasTrackedRef.current) {
      return;
    }

    if (txTypes.length === 0 || txTypes.every((type) => type === "unknown")) {
      return;
    }

    trackEvent("view_tx_summary", {
      hostOrigin,
      chainType,
      chainId,
      txTypes,
    });

    hasTrackedRef.current = true;
  }, [hostOrigin, chainId, chainType, txTypes]);
}

export function trackTxButtonEvent(args: TrackTxButtonEventArgs) {
  const { hostOrigin, chainType, eventType } = args;

  let txTypes: string[];
  let chainId: string | undefined;

  switch (chainType) {
    case "eth": {
      const { actions, chainId: ethChainId } = args;
      txTypes = classifyEthTxType(actions);
      chainId = ethChainId;
      break;
    }

    case "cosmos": {
      const { messages, chainId: cosmosChainId } = args;
      txTypes = classifyCosmosTxType(messages);
      chainId = cosmosChainId;
      break;
    }

    case "svm": {
      const { instructions } = args;
      txTypes = classifySvmTxType(instructions);
      break;
    }
  }

  trackEvent(`click_tx_${eventType}`, {
    hostOrigin,
    chainType,
    chainId,
    txTypes,
  });
}

function classifyEthTxType(actions: EthTxAction[] | null) {
  if (actions === null) {
    return ["unknown"];
  }

  if (actions.length === 0) {
    return ["unknown"];
  }

  return actions.map((action) => action.kind);
}

function classifyCosmosTxType(messages: CosmosMsgs) {
  if (messages.length === 0) {
    return ["unknown"];
  }

  return messages.map((msg) => ("typeUrl" in msg ? msg.typeUrl : msg.type));
}

function classifySvmTxType(instructions: ParsedInstruction[] | null) {
  if (instructions === null || instructions.length === 0) {
    return ["unknown"];
  }

  return instructions.map((ix) => ix.instructionName);
}
