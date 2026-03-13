import type {
  EmailLoginModalApproveAckPayload,
  EmailLoginModalErrorAckPayload,
  EmailLoginModalPayload,
  EmailLoginModalRejectAckPayload,
  TelegramLoginModalApproveAckPayload,
  TelegramLoginModalErrorAckPayload,
  TelegramLoginModalPayload,
  TelegramLoginModalRejectAckPayload,
} from "./auth";
import type {
  MakeSigModalApproveAckPayload,
  MakeSigModalErrorAckPayload,
  MakeSigModalPayload,
  MakeSigModalRejectAckPayload,
} from "./make_sig";
import type {
  OtherModalApproveAckPayload,
  OtherModalErrorAckPayload,
  OtherModalPayload,
  OtherModalRejectAckPayload,
} from "./other";

export * from "./auth";
export * from "./common";
export * from "./make_sig";
export * from "./other";

export type OpenModalPayload =
  | MakeSigModalPayload
  | OtherModalPayload
  | EmailLoginModalPayload
  | TelegramLoginModalPayload;

export type OpenModalAckPayload =
  | MakeSigModalApproveAckPayload
  | MakeSigModalRejectAckPayload
  | MakeSigModalErrorAckPayload
  | OtherModalApproveAckPayload
  | OtherModalRejectAckPayload
  | OtherModalErrorAckPayload
  | EmailLoginModalApproveAckPayload
  | EmailLoginModalRejectAckPayload
  | EmailLoginModalErrorAckPayload
  | TelegramLoginModalApproveAckPayload
  | TelegramLoginModalRejectAckPayload
  | TelegramLoginModalErrorAckPayload;
