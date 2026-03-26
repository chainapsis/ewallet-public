import { Bech32Address, ChainIdHelper } from "@keplr-wallet/cosmos";
import type { Coin } from "@keplr-wallet/types";
import { CoinPretty } from "@keplr-wallet/unit";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useMemo } from "react";

import styles from "../messages.module.scss";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { TxRow } from "@oko-wallet-attached/components/modal_variants/common/tx_row";
import { useMobileMode } from "@oko-wallet-attached/hooks/mobile_mode";
import { useGetMultipleAssetMeta } from "@oko-wallet-attached/web3/cosmos/use_get_asset_meta";

const TokenInfo: FC<{
  chainId: string;
  amount: Coin[];
}> = ({ chainId, amount }) => {
  const isMobile = useMobileMode();
  const { data: currencies, isLoading } = useGetMultipleAssetMeta({
    assets: amount.map((coin) => ({
      minimal_denom: coin.denom,
      chain_identifier: ChainIdHelper.parse(chainId).identifier,
    })),
  });

  const coins = useMemo(() => {
    if (currencies.length === 0) {
      return [];
    }

    return amount.map((coin) => {
      const currency = currencies.find(
        (currency) =>
          currency.coinMinimalDenom.toLowerCase() === coin.denom.toLowerCase(),
      );
      return {
        currency,
        coinPretty: currency
          ? new CoinPretty(currency, coin.amount)
          : undefined,
      };
    });
  }, [currencies]);

  if (isLoading) {
    return <Skeleton width="125px" height="28px" />;
  }

  return (
    <div className={styles.tokenInfoContainer}>
      {coins.map((coin) => (
        <div className={styles.tokenInfo} key={coin.currency?.coinMinimalDenom}>
          <Avatar
            src={coin.currency?.coinImageUrl}
            alt={coin.currency?.coinMinimalDenom ?? "unknown"}
            size={isMobile ? "md" : "sm"}
            variant="rounded"
          />
          <Typography
            color="secondary"
            size={isMobile ? "display-xs" : "lg"}
            weight="semibold"
            className={styles.tokenAmount}
          >
            {coin.coinPretty?.trim(true).toString()}
          </Typography>
        </div>
      ))}
    </div>
  );
};

export const SendMessagePretty: FC<{
  chainId: string;
  amount: Coin[];
  toAddress: string;
}> = ({ chainId, amount, toAddress }) => {
  const isMobile = useMobileMode();
  return (
    <div className={styles.container}>
      <TxRow label="Send">
        <TokenInfo chainId={chainId} amount={amount} />
      </TxRow>
      <TxRow label="To">
        <Typography
          color="secondary"
          size={isMobile ? "md" : "sm"}
          weight="medium"
          className={styles.address}
        >
          {Bech32Address.shortenAddress(toAddress, 32)}
        </Typography>
      </TxRow>
    </div>
  );
};
