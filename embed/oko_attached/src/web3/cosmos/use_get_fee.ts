import { ChainIdHelper } from "@keplr-wallet/cosmos";
import type { Any } from "@keplr-wallet/proto-types/google/protobuf/any";
import type { Coin, StdSignDoc } from "@keplr-wallet/types";
import { CoinPretty, Dec } from "@keplr-wallet/unit";
import type { ChainInfoForAttachedModal } from "@oko-wallet/oko-sdk-core";
import { useMemo } from "react";

import { useGetAssetMeta } from "@oko-wallet-attached/web3/cosmos/use_get_asset_meta";

type AnyWithUnpacked = Any | (Any & { unpacked: unknown });

//NOTE: Because it came from cosmos-sdk via signDocWrapper,
// it is treated as a readable object, so you need to reference the type in
// sign_doc_wrapper.ts in oko-sdk-cosmos.
type DirectSignDoc = {
  txBody: {
    memo?: string;
    messages: AnyWithUnpacked[];
  };
  authInfo: {
    fee: {
      amount: {
        denom: string;
        amount: string;
      }[];
      gasLimit: string;
    };
    signerInfos: [
      {
        modeInfo: {
          single: {
            mode: string;
          };
        };
        publicKey: {
          typeUrl: string;
          value: string;
        };
        sequence: string;
      },
    ];
  };
  chainId: string;
  accountNumber: string;
};

interface UseGetFeeParams {
  signDocJson: StdSignDoc | DirectSignDoc;
  chainInfo: ChainInfoForAttachedModal;
}

function isDirectSignDoc(
  signDocJson: StdSignDoc | DirectSignDoc,
): signDocJson is DirectSignDoc {
  return "authInfo" in signDocJson;
}

export function useGetFee({ signDocJson, chainInfo }: UseGetFeeParams) {
  const feeCoin = useMemo((): Coin | undefined => {
    try {
      if (isDirectSignDoc(signDocJson)) {
        const direct = signDocJson;
        const arr = direct.authInfo.fee.amount as Coin[];
        return Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined;
      }

      const stdSignDoc = signDocJson as StdSignDoc;
      const arr = stdSignDoc.fee.amount;
      return Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined;
    } catch {
      return undefined;
    }
  }, [signDocJson]);

  const localCurrency = useMemo(() => {
    if (!feeCoin) {
      return undefined;
    }

    return (
      chainInfo?.fee_currencies?.find(
        (c) => c.coinMinimalDenom === feeCoin.denom,
      ) ??
      chainInfo?.currencies?.find((c) => c.coinMinimalDenom === feeCoin.denom)
    );
  }, [feeCoin, chainInfo]);

  const { data: fetchedCurrency, isLoading } = useGetAssetMeta({
    chainIdentifier: ChainIdHelper.parse(chainInfo.chain_id).identifier,
    minimalDenom: feeCoin?.denom || "",
    enabled: !localCurrency && !!feeCoin?.denom,
  });

  const feePretty = useMemo(() => {
    if (!feeCoin) {
      return undefined;
    }

    const currency = localCurrency || fetchedCurrency;
    if (!currency) {
      return undefined;
    }

    return new CoinPretty(currency, new Dec(feeCoin.amount));
  }, [feeCoin, localCurrency, fetchedCurrency]);

  return { feePretty, isLoading };
}
