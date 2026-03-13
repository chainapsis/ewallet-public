import { ChainIdHelper } from "@keplr-wallet/cosmos";
import type { ChainInfo, Currency, Msg } from "@keplr-wallet/types";
import { CoinPretty, Dec } from "@keplr-wallet/unit";
import { isEthereumCompatible } from "@oko-wallet/oko-sdk-cosmos";

import { KEPLR_API_ENDPOINT } from "./endpoints";
import { computeAmountInMsgs } from "@oko-wallet-attached/components/modal_variants/cosmos/tx_sig/compute_amout_in_msgs";
import type { AssetMetaParams } from "@oko-wallet-attached/types/asset_meta";
import type { UnpackedMsgForView } from "@oko-wallet-attached/types/cosmos_msg";
import { removeLastSlashIfIs } from "@oko-wallet-attached/utils/url";
import { normalizeIBCDenom } from "@oko-wallet-attached/web3/cosmos/normalize_denom";

/**
 * Get selectable fees for Cosmos chains by features of chainInfo
 * @param chainInfo - Chain info
 * @param gas - Gas
 * @param findOrUpdateAssetMeta - Find or update asset meta
 * @returns Selectable fees
 */
export async function getSelectableFees(
  chainInfo: ChainInfo,
  gas: number,
  findOrUpdateAssetMeta: (params: AssetMetaParams) => Promise<Currency[]>,
): Promise<
  {
    feeCurrency: Currency;
    amount: CoinPretty;
  }[]
> {
  // Ethermint / EVM compatible chains
  if (isEthereumCompatible(chainInfo) || chainInfo.evm) {
    if (chainInfo.feeCurrencies.length === 0) {
      return [];
    }
    const first = chainInfo.feeCurrencies[0];

    const feeCurrency = await findOrUpdateAssetMeta({
      assets: [
        {
          chain_identifier: ChainIdHelper.parse(chainInfo.chainId).identifier,
          minimal_denom: first.coinMinimalDenom,
        },
      ],
    });
    if (feeCurrency.length === 0) {
      return [];
    }
    return [
      {
        feeCurrency: feeCurrency[0],
        amount: new CoinPretty(
          feeCurrency[0],
          // TODO: fee history 구현
          new Dec(first.gasPriceStep?.average ?? 0.025)
            .mul(new Dec(gas))
            .roundUp(),
        ),
      },
    ];
  }

  // Osmosis
  if (
    chainInfo.chainId.startsWith("osmosis-") &&
    chainInfo.features?.includes("osmosis-base-fee-beta")
  ) {
    if (!KEPLR_API_ENDPOINT) {
      throw new Error("NEXT_PUBLIC_KEPLR_API_ENDPOINT is null");
    }
    const baseDenom = "uosmo";
    const response = await fetch(
      `${removeLastSlashIfIs(KEPLR_API_ENDPOINT)}/v1/osmosis_fee_token`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!response.ok) {
      throw new Error(`/v1/osmosis_fee_token failed: ${response.status}`);
    }
    const data = (await response.json()) as {
      // dec
      base_fee: string;
      fee_tokens: {
        denom: string;
        // dec
        spot_price: string;
        asset_meta: {
          symbol: string;
          denom: string;
          decimals: number;
          coin_gecko_id?: string;
          img_url?: string;
        };
      }[];
    };

    const baseDenomCurrency = await findOrUpdateAssetMeta({
      assets: [
        {
          chain_identifier: ChainIdHelper.parse(chainInfo.chainId).identifier,
          minimal_denom: baseDenom,
        },
      ],
    });

    if (baseDenomCurrency.length === 0) {
      return [];
    }
    const feeCurrencyMap = new Map<string, Currency>();
    feeCurrencyMap.set(baseDenom, baseDenomCurrency[0]);

    // 5%의 마진을 곱해줌...
    const baseFeeNumber = new Dec(data.base_fee).mul(new Dec(1.05));
    const selectables: {
      coinMinimalDenom: string;
      gasPrice: Dec;
    }[] = [
      {
        coinMinimalDenom: baseDenom,
        gasPrice: baseFeeNumber,
      },
    ];
    for (const feeToken of data.fee_tokens) {
      feeCurrencyMap.set(feeToken.asset_meta.denom, {
        coinDenom: feeToken.asset_meta.symbol,
        coinMinimalDenom: feeToken.asset_meta.denom,
        coinDecimals: feeToken.asset_meta.decimals,
        coinGeckoId: feeToken.asset_meta.coin_gecko_id ?? undefined,
        coinImageUrl: feeToken.asset_meta.img_url ?? undefined,
      });

      selectables.push({
        coinMinimalDenom: feeToken.asset_meta.denom,
        gasPrice: baseFeeNumber.quo(new Dec(feeToken.spot_price)),
      });
    }

    return selectables.map((selectable) => {
      const feeCurrency = feeCurrencyMap.get(selectable.coinMinimalDenom)!;
      return {
        feeCurrency,
        amount: new CoinPretty(
          feeCurrency,
          new Dec(gas).mul(selectable.gasPrice).roundUp(),
        ),
      };
    });
  }

  // Initia
  if (chainInfo.features?.includes("initia-dynamicfee")) {
    if (!chainInfo.rest) {
      throw new Error("rest_url is missing");
    }
    const response = await fetch(
      `${removeLastSlashIfIs(chainInfo.rest)}/initia/dynamicfee/v1/params`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!response.ok) {
      throw new Error(
        `/initia/dynamicfee/v1/params failed: ${response.status}`,
      );
    }
    const data = (await response.json()) as {
      params: {
        base_gas_price: string;
      };
    };
    // 5%의 마진을 곱해줌...
    const basGasPrice = parseFloat(data.params.base_gas_price) * 1.05;
    const baseDenom = "uinit";
    const feeCurrency = await findOrUpdateAssetMeta({
      assets: [
        {
          chain_identifier: ChainIdHelper.parse(chainInfo.chainId).identifier,
          minimal_denom: baseDenom,
        },
      ],
    });
    if (feeCurrency.length === 0) {
      return [];
    }
    return [
      {
        feeCurrency: feeCurrency[0],
        amount: new CoinPretty(
          feeCurrency[0],
          new Dec(gas).mul(new Dec(basGasPrice)).roundUp(),
        ),
      },
    ];
  }

  // Feemarket
  if (chainInfo.features?.includes("feemarket")) {
    if (!chainInfo.rest) {
      throw new Error("rest_url is missing");
    }
    const response = await fetch(
      `${removeLastSlashIfIs(chainInfo.rest)}/feemarket/v1/gas_prices`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!response.ok) {
      throw new Error(`/feemarket/v1/gas_prices failed: ${response.status}`);
    }
    const data = (await response.json()) as {
      prices: {
        denom: string;
        amount: string;
      }[];
    };
    const gasPricesMap = new Map<string, Dec>();
    for (const price of data.prices) {
      gasPricesMap.set(price.denom, new Dec(price.amount));
    }

    const feeCurrencies = await findOrUpdateAssetMeta({
      assets: data.prices.map((fee) => ({
        chain_identifier: ChainIdHelper.parse(chainInfo.chainId).identifier,
        minimal_denom: fee.denom,
      })),
    });
    if (feeCurrencies.length === 0) {
      return [];
    }
    return feeCurrencies.map((feeCurrency) => ({
      feeCurrency,
      amount: new CoinPretty(
        feeCurrency,
        gasPricesMap
          .get(feeCurrency.coinMinimalDenom)!
          .mul(new Dec(gas))
          .roundUp(),
      ),
    }));
  }

  // Default: use chainInfo.feeCurrencies
  if (chainInfo.feeCurrencies.length === 0) {
    return [];
  }
  const rawFeeCurrenciesMap = new Map<
    string,
    {
      gasPriceStep?: {
        average: number;
      };
    }
  >();

  for (const feeCurrency of chainInfo.feeCurrencies) {
    rawFeeCurrenciesMap.set(feeCurrency.coinMinimalDenom, feeCurrency);
  }

  const feeCurrencies = await findOrUpdateAssetMeta({
    assets: chainInfo.feeCurrencies.map((fee) => ({
      chain_identifier: ChainIdHelper.parse(chainInfo.chainId).identifier,
      minimal_denom: fee.coinMinimalDenom,
    })),
  });

  if (feeCurrencies.length === 0) {
    return [];
  }

  return feeCurrencies.map((feeCurrency) => ({
    feeCurrency,
    amount: new CoinPretty(
      feeCurrency,
      new Dec(
        rawFeeCurrenciesMap.get(feeCurrency.coinMinimalDenom)?.gasPriceStep
          ?.average ?? 0.025,
      )
        .mul(new Dec(gas))
        .roundUp(),
    ),
  }));
}

/**
 * Get available fees by comparing amount with balances and selectable fees for Cosmos chains
 * @param chainInfo - Chain info
 * @param signer - Signer
 * @param msgs - Messages
 * @param selectableFees - Selectable fees
 * @returns Available selectable fees
 */
export async function getAvailableSelectableFees(
  chainInfo: ChainInfo,
  signer: string,
  msgs: UnpackedMsgForView[] | readonly Msg[],
  selectableFees: {
    feeCurrency: Currency;
    amount: CoinPretty;
  }[],
  findOrUpdateAssetMeta: (params: AssetMetaParams) => Promise<Currency[]>,
) {
  if (selectableFees.length === 0 || !chainInfo.rest) {
    return { availableFees: [], insufficientBalanceFee: null };
  }

  const response = await fetch(
    `${removeLastSlashIfIs(chainInfo.rest)}/cosmos/bank/v1beta1/balances/${signer}?pagination.limit=1000`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );
  if (response.ok) {
    const data = (await response.json()) as {
      balances: {
        denom: string;
        amount: string;
      }[];
    };

    const balanceMap = new Map<string, string>();

    const amountInMsgs = await computeAmountInMsgs({
      disableBalanceCheck: false,
      msgs: msgs,
      chainInfo,
      signer,
      findOrUpdateAssetMeta,
    });

    for (const balance of data.balances) {
      // handle exception, ATONE is not allowed as fee denom except for MsgMintPhoton
      const isExcluded = excludeATONE(chainInfo.chainId, balance.denom, msgs);
      if (isExcluded) {
        continue;
      }

      balanceMap.set(normalizeIBCDenom(balance.denom), balance.amount);
    }

    const feesToDisplayWhenHasBalance: {
      feeCurrency: Currency;
      amount: CoinPretty;
    }[] = [];

    const feeWithAmountInMsgMap = new Map<string, CoinPretty>();
    if (amountInMsgs.length > 0) {
      for (let i = 0; i < selectableFees.length; i++) {
        const need = selectableFees[i];
        for (const amt of amountInMsgs) {
          if (
            need.feeCurrency.coinMinimalDenom === amt.currency.coinMinimalDenom
          ) {
            feeWithAmountInMsgMap.set(
              need.feeCurrency.coinMinimalDenom,
              need.amount.add(amt),
            );
          }
        }
      }
    }

    const availableFees = selectableFees.filter((fee) => {
      const balance = balanceMap.get(
        normalizeIBCDenom(fee.feeCurrency.coinMinimalDenom),
      );

      if (balance) {
        const balCoin = new CoinPretty(fee.feeCurrency, balance);
        const needToPayFee =
          feeWithAmountInMsgMap.get(fee.feeCurrency.coinMinimalDenom) ||
          fee.amount;

        const isSufficientBalance = balCoin.toDec().gte(needToPayFee.toDec());
        if (
          !isSufficientBalance &&
          chainInfo.feeCurrencies.some(
            (feeCurrency) =>
              feeCurrency.coinMinimalDenom === fee.feeCurrency.coinMinimalDenom,
          )
        ) {
          feesToDisplayWhenHasBalance.push(fee);
        }

        return isSufficientBalance;
      }
      return false;
    });

    const insufficientBalanceFee =
      (() => {
        if (chainInfo.chainId.includes("atomone")) {
          if (feesToDisplayWhenHasBalance.length > 0) {
            return feesToDisplayWhenHasBalance.find(
              (fee) =>
                !excludeATONE(
                  chainInfo.chainId,
                  fee.feeCurrency.coinMinimalDenom,
                  msgs,
                ),
            );
          }

          return selectableFees.find(
            (fee) =>
              !excludeATONE(
                chainInfo.chainId,
                fee.feeCurrency.coinMinimalDenom,
                msgs,
              ),
          );
        }

        return feesToDisplayWhenHasBalance.length > 0
          ? feesToDisplayWhenHasBalance[0]
          : availableFees[0];
      })() ?? null;

    return { availableFees, insufficientBalanceFee };
  } else {
    console.error(`/cosmos/bank/v1beta1/balances failed: ${response.status}`);

    return { availableFees: [], insufficientBalanceFee: null };
  }
}

/**
 * Sort selectable fees by priority: chainInfo's feeCurrencies first, then IBC denoms, then others in original order
 * @param chainInfo - Chain info
 * @param selectableFees - Selectable fees
 * @returns Sorted selectable fees by priority
 */
export function sortSelectableFees(
  chainInfo: ChainInfo,
  selectableFees: {
    feeCurrency: Currency;
    amount: CoinPretty;
  }[],
) {
  return selectableFees.sort((a, b) => {
    const aIndex = chainInfo.feeCurrencies.findIndex(
      (fee) => fee.coinMinimalDenom === a.feeCurrency.coinMinimalDenom,
    );
    const bIndex = chainInfo.feeCurrencies.findIndex(
      (fee) => fee.coinMinimalDenom === b.feeCurrency.coinMinimalDenom,
    );

    const aIsInChainInfo = aIndex !== -1;
    const bIsInChainInfo = bIndex !== -1;

    if (aIsInChainInfo && bIsInChainInfo) {
      return aIndex - bIndex;
    }

    if (aIsInChainInfo && !bIsInChainInfo) {
      return -1;
    }

    if (!aIsInChainInfo && bIsInChainInfo) {
      return 1;
    }

    const aIsIBC = a.feeCurrency.coinMinimalDenom.startsWith("ibc/");
    const bIsIBC = b.feeCurrency.coinMinimalDenom.startsWith("ibc/");

    if (aIsIBC === bIsIBC) {
      return 0;
    }

    return aIsIBC ? 1 : -1;
  });
}

function excludeATONE(
  chainId: string,
  coinMinimalDenom: string,
  msgs: UnpackedMsgForView[] | readonly Msg[],
): boolean {
  const chainIdentifier = ChainIdHelper.parse(chainId).identifier;
  const isATONE =
    chainIdentifier === "atomone" && coinMinimalDenom === "uatone";
  const hasMintPhotonMsg = msgs.some((msg) => {
    if ("typeUrl" in msg) {
      return msg.typeUrl.includes("MsgMintPhoton");
    }
    return msg.type.includes("MsgMintPhoton");
  });

  return isATONE && !hasMintPhotonMsg;
}
