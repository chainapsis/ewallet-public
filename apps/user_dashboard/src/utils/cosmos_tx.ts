import { MsgSend } from "@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx";
import { PubKey } from "@keplr-wallet/proto-types/cosmos/crypto/secp256k1/keys";
import { SignMode } from "@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing";
import {
  AuthInfo,
  Fee,
  TxBody,
  TxRaw,
} from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";

const SECP256K1_PUBKEY_TYPE_URL = "/cosmos.crypto.secp256k1.PubKey";
const MSG_SEND_TYPE_URL = "/cosmos.bank.v1beta1.MsgSend";

export interface BuildSendBodyParams {
  fromAddress: string;
  toAddress: string;
  amount: string;
  denom: string;
  memo: string;
}

export function encodeSendTxBody(params: BuildSendBodyParams): Uint8Array {
  return TxBody.encode(
    // biome-ignore lint/complexity/noBannedTypes: required by protobuf fromPartial generic
    TxBody.fromPartial<{}>({
      messages: [
        {
          typeUrl: MSG_SEND_TYPE_URL,
          value: MsgSend.encode({
            fromAddress: params.fromAddress,
            toAddress: params.toAddress,
            amount: [{ denom: params.denom, amount: params.amount }],
          }).finish(),
        },
      ],
      memo: params.memo,
    }),
  ).finish();
}

export interface BuildAuthInfoParams {
  pubKey: Uint8Array;
  sequence: string;
  gasLimit: string;
  feeAmount: string;
  feeDenom: string;
}

export function encodeAuthInfo(params: BuildAuthInfoParams): Uint8Array {
  return AuthInfo.encode({
    signerInfos: [
      {
        publicKey: {
          typeUrl: SECP256K1_PUBKEY_TYPE_URL,
          value: PubKey.encode({ key: params.pubKey }).finish(),
        },
        modeInfo: {
          single: { mode: SignMode.SIGN_MODE_DIRECT },
          multi: undefined,
        },
        sequence: params.sequence,
      },
    ],
    // biome-ignore lint/complexity/noBannedTypes: required by protobuf fromPartial generic
    fee: Fee.fromPartial<{}>({
      amount: [{ denom: params.feeDenom, amount: params.feeAmount }],
      gasLimit: params.gasLimit,
    }),
  }).finish();
}

export function encodeTxRaw(
  bodyBytes: Uint8Array,
  authInfoBytes: Uint8Array,
  signature: Uint8Array,
): Uint8Array {
  return TxRaw.encode({
    bodyBytes,
    authInfoBytes,
    signatures: [signature],
  }).finish();
}

export function encodeUnsignedTxForSimulate(
  bodyBytes: Uint8Array,
  authInfoBytes: Uint8Array,
): Uint8Array {
  return TxRaw.encode({
    bodyBytes,
    authInfoBytes,
    signatures: [new Uint8Array(64)],
  }).finish();
}
