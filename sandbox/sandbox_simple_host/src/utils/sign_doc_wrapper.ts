import type { StdSignDoc } from "@cosmjs/amino";
import {
  AuthInfo,
  TxBody,
} from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import type { Any } from "@keplr-wallet/proto-types/google/protobuf/any";
import type { SignDoc } from "@oko-wallet/oko-sdk-cosmos";

export type AnyWithUnpacked = Any | (Any & { unpacked: unknown });

interface ProtoSignDoc {
  txMsgs: AnyWithUnpacked[];
  toJSON: () => {
    chain_id: string;
    account_number: string;
    sequence: string;
    body: AnyWithUnpacked[];
    auth_info: Record<string, unknown>;
  };
}

type SupportedSignDoc = StdSignDoc | SignDoc;

export class SignDocWrapper {
  private _aminoSignDoc?: StdSignDoc;
  private _protoSignDoc?: ProtoSignDoc;

  private constructor(readonly _signDoc: SupportedSignDoc) {}

  static fromAminoSignDoc(signDoc: StdSignDoc): SignDocWrapper {
    const wrapper = new SignDocWrapper(signDoc);
    wrapper._aminoSignDoc = signDoc;
    return wrapper;
  }

  static fromDirectSignDoc(signDoc: SignDoc): SignDocWrapper {
    const wrapper = new SignDocWrapper(signDoc);
    const txMsgs = SignDocWrapper.extractTxMessages(signDoc);
    const sequence = SignDocWrapper.extractSequence(signDoc);
    const accountNumber = SignDocWrapper.formatAccountNumber(
      signDoc.accountNumber,
    );

    wrapper._protoSignDoc = {
      txMsgs,
      toJSON: () => ({
        chain_id: signDoc.chainId,
        account_number: accountNumber,
        sequence,
        body: txMsgs,
        auth_info: {},
      }),
    };

    return wrapper;
  }

  private static extractTxMessages(signDoc: SignDoc): AnyWithUnpacked[] {
    const bodyBytes = (signDoc as any).bodyBytes;
    if (!bodyBytes) {
      return [];
    }

    try {
      const txBody = TxBody.decode(bodyBytes);
      return (txBody.messages || []) as AnyWithUnpacked[];
    } catch (error) {
      console.warn("Failed to decode TxBody:", error);
      return [];
    }
  }

  private static extractSequence(signDoc: SignDoc): string {
    const authInfoBytes = (signDoc as any).authInfoBytes;
    if (!authInfoBytes) {
      return "0";
    }

    try {
      const authInfo = AuthInfo.decode(authInfoBytes);
      return authInfo.signerInfos?.[0]?.sequence || "0";
    } catch {
      return "0";
    }
  }

  private static formatAccountNumber(
    accountNumber: bigint | number | string,
  ): string {
    if (typeof accountNumber === "bigint") {
      return accountNumber.toString();
    }
    return String(accountNumber);
  }

  get aminoSignDoc(): StdSignDoc {
    if (!this._aminoSignDoc) {
      throw new Error("SignDocWrapper does not contain an amino sign doc");
    }
    return this._aminoSignDoc;
  }

  get protoSignDoc(): ProtoSignDoc {
    if (!this._protoSignDoc) {
      throw new Error("SignDocWrapper does not contain a proto sign doc");
    }
    return this._protoSignDoc;
  }
}
