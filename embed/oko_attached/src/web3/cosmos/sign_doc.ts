import type { AminoMsg, StdSignDoc } from "@cosmjs/amino";
import {
  AuthInfo,
  TxBody,
} from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import type { Any } from "@keplr-wallet/proto-types/google/protobuf/any";
import type { MakeCosmosSigError } from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";
import type { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";

import { sortObjectByKey } from "@oko-wallet-attached/utils/json";

export function extractAuthInfoFromSignDoc(
  signDoc: SignDoc,
): Result<AuthInfo, MakeCosmosSigError> {
  const authInfoBytes = (signDoc as any).authInfoBytes;

  if (!authInfoBytes) {
    return {
      success: false,
      err: {
        type: "sign_doc_parse_fail",
        error: "authInfoBytes is null",
      },
    };
  }

  try {
    const authInfo = AuthInfo.decode(authInfoBytes);
    return {
      success: true,
      data: authInfo,
    };
  } catch {
    return {
      success: false,
      err: {
        type: "sign_doc_parse_fail",
        error: "Failed to decode AuthInfo",
      },
    };
  }
}

export function extractMsgsFromSignDoc(
  signDoc: SignDoc | StdSignDoc,
): Result<Any[] | readonly AminoMsg[], MakeCosmosSigError> {
  if ("msgs" in signDoc) {
    return {
      success: true,
      data: signDoc.msgs,
    };
  }

  const result = extractTxBodyFromSignDoc(signDoc);
  if (!result.success) {
    return {
      success: false,
      err: result.err,
    };
  }

  return {
    success: true,
    data: result.data?.messages ?? [],
  };
}

export function extractTxBodyFromSignDoc(
  signDoc: SignDoc,
): Result<TxBody, MakeCosmosSigError> {
  const bodyBytes = (signDoc as any).bodyBytes;
  if (!bodyBytes) {
    return {
      success: false,
      err: {
        type: "sign_doc_parse_fail",
        error: "bodyBytes is null",
      },
    };
  }

  try {
    const txBody = TxBody.decode(bodyBytes);
    return {
      success: true,
      data: txBody,
    };
  } catch (error) {
    console.warn("Failed to decode TxBody:", error);
    return {
      success: false,
      err: {
        type: "sign_doc_parse_fail",
        error: "Failed to decode TxBody",
      },
    };
  }
}

export function signDocToJson(
  signDoc: SignDoc | StdSignDoc,
): Result<StdSignDoc, MakeCosmosSigError> {
  if ("account_number" in signDoc) {
    return {
      success: true,
      data: signDoc,
    };
  }

  const authInfoRes = extractAuthInfoFromSignDoc(signDoc);
  const txBodyRes = extractTxBodyFromSignDoc(signDoc);

  if (!txBodyRes.success) {
    return {
      success: false,
      err: txBodyRes.err,
    };
  }
  const txBody = txBodyRes.data;

  if (!authInfoRes.success) {
    return {
      success: false,
      err: authInfoRes.err,
    };
  }
  const authInfo = authInfoRes.data;

  return {
    success: true,
    data: sortObjectByKey({
      txBody: {
        ...(TxBody.toJSON(txBody) as any),
        ...{
          messages: txBody.messages.map((msg) => {
            return {
              typeUrl: msg.typeUrl,
              value: Buffer.from(msg.value).toString("base64"),
            };
          }),
        },
      },
      authInfo: AuthInfo.toJSON(authInfo),
      chainId: signDoc.chainId,
      accountNumber: signDoc.accountNumber.toString(),
    }),
  };
}
