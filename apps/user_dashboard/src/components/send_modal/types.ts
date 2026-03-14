import type {
  Currency,
  ModularChainInfo,
} from "@oko-wallet-user-dashboard/types/chain";
import type { TokenBalance } from "@oko-wallet-user-dashboard/types/token";

export type SendStep = "select_token" | "enter_details" | "review" | "status";

export type TransactionStatus = "idle" | "pending" | "success" | "error";

export type TokenType = "native" | "erc20" | "cw20" | "spl";

export interface SendFlowState {
  step: SendStep;
  selectedToken: TokenBalance | null;
  recipientAddress: string;
  amount: string;
  amountRaw: string;
  estimatedFee: string | null;
  feeCurrency: Currency | null;
  txStatus: TransactionStatus;
  txHash: string | null;
  txError: string | null;
}

export type SendFlowAction =
  | { type: "SELECT_TOKEN"; payload: TokenBalance }
  | { type: "SET_RECIPIENT"; payload: string }
  | { type: "SET_AMOUNT"; payload: { amount: string; amountRaw: string } }
  | { type: "SET_FEE"; payload: { fee: string; currency: Currency } }
  | { type: "GO_TO_STEP"; payload: SendStep }
  | { type: "TX_PENDING" }
  | { type: "TX_SUCCESS"; payload: string }
  | { type: "TX_ERROR"; payload: string }
  | { type: "RESET" };

export const initialSendFlowState: SendFlowState = {
  step: "select_token",
  selectedToken: null,
  recipientAddress: "",
  amount: "",
  amountRaw: "0",
  estimatedFee: null,
  feeCurrency: null,
  txStatus: "idle",
  txHash: null,
  txError: null,
};

export function sendFlowReducer(
  state: SendFlowState,
  action: SendFlowAction,
): SendFlowState {
  switch (action.type) {
    case "SELECT_TOKEN":
      return {
        ...state,
        selectedToken: action.payload,
        step: "enter_details",
      };
    case "SET_RECIPIENT":
      return { ...state, recipientAddress: action.payload };
    case "SET_AMOUNT":
      return {
        ...state,
        amount: action.payload.amount,
        amountRaw: action.payload.amountRaw,
      };
    case "SET_FEE":
      return {
        ...state,
        estimatedFee: action.payload.fee,
        feeCurrency: action.payload.currency,
      };
    case "GO_TO_STEP":
      return { ...state, step: action.payload };
    case "TX_PENDING":
      return { ...state, txStatus: "pending", txError: null };
    case "TX_SUCCESS":
      return {
        ...state,
        txStatus: "success",
        txHash: action.payload,
        step: "status",
      };
    case "TX_ERROR":
      return {
        ...state,
        txStatus: "error",
        txError: action.payload,
        step: "status",
      };
    case "RESET":
      return initialSendFlowState;
    default:
      return state;
  }
}

export function getTokenType(
  currency: Currency,
  chainInfo: ModularChainInfo,
): TokenType {
  const denom = currency.coinMinimalDenom;

  if (denom.startsWith("erc20:")) {
    return "erc20";
  }
  if (denom.startsWith("spl:")) {
    return "spl";
  }

  // CW20: contract address on Cosmos chains (bech32 format, long)
  if (
    chainInfo.cosmos &&
    denom.length > 44 &&
    !denom.startsWith("ibc/") &&
    !denom.startsWith("factory/")
  ) {
    return "cw20";
  }

  return "native";
}
