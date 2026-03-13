import type { AnyWithUnpacked } from "@keplr-wallet/cosmos";
import type { Msg } from "@keplr-wallet/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { postRawJSONFromProtoMsgs } from "@oko-wallet-attached/requests/proto_codec";
import type { UnpackedMsgForView } from "@oko-wallet-attached/types/cosmos_msg";
import { convertProtoToRawJsonMsg } from "@oko-wallet-attached/web3/cosmos/proto_msg";

function isProtoMsgs(
  msgs: readonly Msg[] | AnyWithUnpacked[],
): msgs is AnyWithUnpacked[] {
  return "typeUrl" in msgs[0];
}

export function useGetSignDocStringWithParsedMsg(
  chainPrefix: string,
  messages: AnyWithUnpacked[] | readonly Msg[],
  signDocJson: any,
): {
  isLoading: boolean;
  error: Error | null;
  signDocString: string;
} {
  if (!isProtoMsgs(messages)) {
    return {
      isLoading: false,
      error: null,
      signDocString: JSON.stringify(signDocJson, null, 2),
    };
  }

  // biome-ignore lint/correctness/useHookAtTopLevel: hook is called after early return guard
  const { data, isLoading, error } = useGetParsedMsgs({
    chainPrefix,
    messages,
  });

  const newSignDocString = JSON.stringify(
    {
      ...signDocJson,
      txBody: {
        ...signDocJson.txBody,
        messages: data.map((msg) => {
          const protoMsg = msg as UnpackedMsgForView;

          return {
            typeUrl: protoMsg.typeUrl,
            value: protoMsg.unpacked ?? protoMsg.value,
          };
        }),
      },
    },
    null,
    2,
  );

  return { signDocString: newSignDocString, isLoading, error };
}

export function useGetParsedMsgs({
  chainPrefix,
  messages,
}: UseGetParsedMsgsArgs): UseGetParsedMsgsReturn {
  if (!isProtoMsgs(messages)) {
    return {
      isLoading: false,
      error: null,
      data: messages,
    };
  }

  // biome-ignore lint/correctness/useHookAtTopLevel: hook is called after early return guard
  const protoMsgs = useMemo(() => {
    return messages.map((msg) => {
      return {
        typeUrl: msg.typeUrl,
        value: Buffer.from(msg.value).toString("base64"),
      };
    });
  }, [messages]);

  // biome-ignore lint/correctness/useHookAtTopLevel: hook is called after early return guard
  const { data, isLoading, error } = useQuery({
    queryKey: ["getRawJSONFromProtoMsgs", chainPrefix, protoMsgs],
    queryFn: async () => {
      const res = await postRawJSONFromProtoMsgs(chainPrefix, protoMsgs);
      return convertProtoToRawJsonMsg(protoMsgs, res.result.messages);
    },
    enabled: !!chainPrefix && !!protoMsgs,
    retry: false,
  });

  return { isLoading, error, data: data ?? [] };
}

export interface UseGetParsedMsgsArgs {
  chainPrefix: string;
  messages: AnyWithUnpacked[] | readonly Msg[];
}

export interface UseGetParsedMsgsReturn {
  isLoading: boolean;
  error: Error | null;
  data: readonly Msg[] | UnpackedMsgForView[];
}
