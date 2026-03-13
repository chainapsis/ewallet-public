import type { AminoMsg } from "@cosmjs/amino";
import { ChainIdHelper } from "@keplr-wallet/cosmos";
import type { Any } from "@keplr-wallet/proto-types/google/protobuf/any";
import type { ChainInfo, Currency } from "@keplr-wallet/types";
import { CoinPretty } from "@keplr-wallet/unit";
import type { ChainInfoForAttachedModal } from "@oko-wallet/oko-sdk-core";
import { useQuery } from "@tanstack/react-query";

import type { InsufficientBalanceFee } from "./types";
import { useGetParsedMsgs } from "@oko-wallet-attached/components/modal_variants/cosmos/tx_sig/use_parse_msgs";
import {
  getAvailableSelectableFees,
  getSelectableFees,
  sortSelectableFees,
} from "@oko-wallet-attached/requests/cosmos_selectable_fees";
import { DEMO_WEB_ORIGIN } from "@oko-wallet-attached/requests/endpoints";
import { useAssetMetaStore } from "@oko-wallet-attached/store/asset_meta";

export interface UseCosmosSignFeeArgs {
  preferNoSetFee: boolean;
  disableBalanceCheck: boolean;
  simulationKey: string;
  modalChainInfo: ChainInfoForAttachedModal;
  signer: string;
  defaultFee: { amount: string; denom: string } | undefined;
  gas: number;
  hostOrigin: string;
  msgs: Any[] | readonly AminoMsg[];
}

export interface UseCosmosSignFeeReturn {
  fee: {
    feeCurrency: Currency;
    amount: CoinPretty;
  } | null;
  gas: number;
  isLoading: boolean;
  error: Error | null;
  insufficientBalanceFee: InsufficientBalanceFee | null;
}

function toChainInfo(chainInfo: ChainInfoForAttachedModal): ChainInfo {
  return {
    rpc: chainInfo.rpc_url,
    rest: chainInfo.rest_url ?? "",
    chainId: chainInfo.chain_id,
    chainName: chainInfo.chain_name,
    chainSymbolImageUrl: chainInfo.chain_symbol_image_url,
    bip44: chainInfo.bip44 ?? {
      coinType: 118,
    },
    bech32Config: chainInfo.bech32_config,
    feeCurrencies: chainInfo.fee_currencies ?? [],
    currencies: chainInfo.currencies ?? [],
    features: chainInfo.features ?? undefined,
    evm: chainInfo.evm ?? undefined,
  };
}

export function useCosmosSignFee(
  args: UseCosmosSignFeeArgs,
): UseCosmosSignFeeReturn {
  const {
    preferNoSetFee,
    disableBalanceCheck,
    simulationKey,
    modalChainInfo,
    signer,
    defaultFee,
    gas,
    msgs,
    hostOrigin,
  } = args;

  const findOrUpdateAssetMeta = useAssetMetaStore(
    (s) => s.findOrUpdateAssetMeta,
  );

  const isDemo = !!hostOrigin && hostOrigin === DEMO_WEB_ORIGIN;

  const chainInfo = toChainInfo(modalChainInfo);
  const { data: parsedMsgs } = useGetParsedMsgs({
    chainPrefix: chainInfo.bech32Config?.bech32PrefixAccAddr ?? "",
    messages: msgs,
  });

  const querySelectableFees = useQuery<{
    availableFees: { feeCurrency: Currency; amount: CoinPretty }[];
    insufficientBalanceFee: {
      feeCurrency: Currency;
      amount: CoinPretty;
    } | null;
  }>({
    queryKey: [
      "querySelectableFees",
      simulationKey,
      chainInfo.chainId,
      signer,
      preferNoSetFee,
      defaultFee?.denom,
      defaultFee?.amount,
      gas,
      isDemo,
    ],
    refetchOnMount: "always",
    queryFn: async () => {
      if (preferNoSetFee) {
        if (defaultFee) {
          const feeCurrency = await findOrUpdateAssetMeta({
            assets: [
              {
                chain_identifier: ChainIdHelper.parse(chainInfo.chainId)
                  .identifier,
                minimal_denom: defaultFee.denom,
              },
            ],
          });

          if (feeCurrency.length === 0) {
            return {
              availableFees: [],
              insufficientBalanceFee: null,
            };
          }

          if (disableBalanceCheck) {
            return {
              availableFees: [
                {
                  feeCurrency: feeCurrency[0],
                  amount: new CoinPretty(feeCurrency[0], defaultFee.amount),
                },
              ],
              insufficientBalanceFee: null,
            };
          }

          const { availableFees, insufficientBalanceFee } =
            await getAvailableSelectableFees(
              chainInfo,
              signer,
              parsedMsgs,
              [
                {
                  feeCurrency: feeCurrency[0],
                  amount: new CoinPretty(feeCurrency[0], defaultFee.amount),
                },
              ],
              findOrUpdateAssetMeta,
            );

          return {
            availableFees,
            insufficientBalanceFee,
          };
        } else {
          return {
            availableFees: [],
            insufficientBalanceFee: null,
          };
        }
      }

      const selectableFees = await getSelectableFees(
        chainInfo,
        gas,
        findOrUpdateAssetMeta,
      );

      // Do not check available fees in demo
      // CHECK: separate check available fees logic to another query?
      if (isDemo) {
        return {
          availableFees: sortSelectableFees(chainInfo, selectableFees),
          insufficientBalanceFee: null,
        };
      }

      const { availableFees, insufficientBalanceFee } =
        await getAvailableSelectableFees(
          chainInfo,
          signer,
          parsedMsgs,
          selectableFees,
          findOrUpdateAssetMeta,
        );

      return {
        availableFees: sortSelectableFees(chainInfo, availableFees),
        insufficientBalanceFee: insufficientBalanceFee ?? null,
      };
    },
  });

  const fee =
    querySelectableFees.data &&
    querySelectableFees.data.availableFees.length > 0
      ? querySelectableFees.data.availableFees[0]
      : null;

  return {
    fee,
    insufficientBalanceFee:
      querySelectableFees.data?.insufficientBalanceFee ?? null,
    gas: gas,
    isLoading: querySelectableFees.isLoading,
    error: querySelectableFees.error,
  };
}
