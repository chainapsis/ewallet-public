"use client";

import { PricePretty } from "@keplr-wallet/unit";
import { EmptyStateIcon } from "@oko-wallet/oko-common-ui/icons/empty_state_icon";
import { SearchIcon } from "@oko-wallet/oko-common-ui/icons/search";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type ChangeEvent, type FC, useMemo, useState } from "react";

import styles from "../send_modal.module.scss";
import { useAllBalances } from "@oko-wallet-user-dashboard/hooks/queries";
import type { TokenBalance } from "@oko-wallet-user-dashboard/types/token";
import {
  calculateUsdValue,
  formatDisplayBalance,
} from "@oko-wallet-user-dashboard/utils/format_token_amount";

interface SelectTokenStepProps {
  onSelectToken: (token: TokenBalance) => void;
}

export const SelectTokenStep: FC<SelectTokenStepProps> = ({
  onSelectToken,
}) => {
  const { balances, isLoading } = useAllBalances();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Only show tokens with non-zero balance
  const sendableTokens = useMemo(() => {
    const filtered = balances.filter(
      (bal) => BigInt(bal.token.amount) > BigInt(0),
    );

    if (!searchQuery.trim()) {
      return filtered;
    }

    const query = searchQuery.toLowerCase();
    return filtered.filter((bal) => {
      const chainName = bal.chainInfo.chainName.toLowerCase();
      const symbol = bal.token.currency.coinDenom.toLowerCase();
      return chainName.includes(query) || symbol.includes(query);
    });
  }, [balances, searchQuery]);

  return (
    <>
      <div className={styles.searchBar}>
        <SearchIcon color="var(--fg-quaternary)" size={16} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search tokens or chains"
          value={searchQuery}
          onChange={handleSearchChange}
          name="search-send-tokens"
        />
      </div>

      <div className={styles.tokenList}>
        {sendableTokens.length > 0 ? (
          sendableTokens.map((asset) => (
            <TokenSelectItem
              key={`${asset.chainInfo.chainId}-${asset.token.currency.coinMinimalDenom}`}
              tokenBalance={asset}
              onClick={() => onSelectToken(asset)}
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            <EmptyStateIcon size={32} />
            <Typography size="sm" color="tertiary">
              {isLoading ? "Loading tokens..." : "No tokens with balance found"}
            </Typography>
          </div>
        )}
      </div>
    </>
  );
};

const TokenSelectItem: FC<{
  tokenBalance: TokenBalance;
  onClick: () => void;
}> = ({ tokenBalance, onClick }) => {
  const currency = tokenBalance.token.currency;
  const imageUrl = currency.coinImageUrl;
  const priceUsd = tokenBalance.priceUsd;
  const valueUsd = priceUsd
    ? calculateUsdValue(
        tokenBalance.token.amount,
        currency.coinDecimals,
        priceUsd,
      )
    : undefined;

  return (
    <div className={styles.tokenSelectItem} onClick={onClick}>
      <div className={styles.tokenSelectLeft}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={currency.coinDenom}
            className={styles.tokenImage}
          />
        ) : (
          <EmptyStateIcon size={28} />
        )}
        <div className={styles.tokenNameInfo}>
          <Typography size="sm" weight="medium" color="primary">
            {currency.coinDenom}
          </Typography>
          <Typography size="xs" color="tertiary">
            {tokenBalance.chainInfo.chainName}
          </Typography>
        </div>
      </div>
      <div className={styles.tokenBalanceInfo}>
        <Typography size="sm" weight="medium" color="secondary">
          {formatDisplayBalance(tokenBalance.token.amount, currency)}
        </Typography>
        {valueUsd !== undefined && (
          <Typography size="xs" color="tertiary">
            {new PricePretty(
              {
                currency: "usd",
                symbol: "$",
                maxDecimals: 2,
                locale: "en-US",
              },
              valueUsd,
            ).toString()}
          </Typography>
        )}
      </div>
    </div>
  );
};
