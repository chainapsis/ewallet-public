import { CheckCircleOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/check_circle_outlined";
import { SearchIcon } from "@oko-wallet/oko-common-ui/icons/search";
import { ImageWithAlt } from "@oko-wallet/oko-common-ui/image_with_alt";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type ChangeEvent, type FC, useMemo, useState } from "react";

import { TokenItem } from "../token_item/token_item";
import styles from "./token_list.module.scss";
import { ShowHideChainsModal } from "@oko-wallet-user-dashboard/components/show_hide_chains_modal/show_hide_chains_modal";
import { S3_BUCKET_URL } from "@oko-wallet-user-dashboard/fetch";
import { useAllBalances } from "@oko-wallet-user-dashboard/hooks/queries";
import { calculateUsdValue } from "@oko-wallet-user-dashboard/utils/format_token_amount";

// Minimum USD value to show (for hide low balance filter)
const LOW_BALANCE_THRESHOLD_USD = 0.1;

export const TokenList: FC = () => {
  const { balances, isLoading } = useAllBalances();

  const [searchQuery, setSearchQuery] = useState("");
  const [isHideLowBalance, setIsHideLowBalance] = useState(false);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter tokens by search query
  const searchedTokens = useMemo(() => {
    if (!searchQuery.trim()) {
      return balances;
    }

    const query = searchQuery.toLowerCase();
    return balances.filter((bal) => {
      const chainName = bal.chainInfo.chainName.toLowerCase();
      const symbol = bal.token.currency.coinDenom.toLowerCase();
      return chainName.includes(query) || symbol.includes(query);
    });
  }, [balances, searchQuery]);

  // Filter low balance tokens
  const filteredTokens = useMemo(() => {
    if (!isHideLowBalance) {
      return searchedTokens;
    }

    return searchedTokens.filter((bal) => {
      if (!bal.priceUsd) {
        return true;
      }

      const valueUsd = calculateUsdValue(
        bal.token.amount,
        bal.token.currency.coinDecimals,
        bal.priceUsd,
      );
      return valueUsd >= LOW_BALANCE_THRESHOLD_USD;
    });
  }, [searchedTokens, isHideLowBalance]);

  // Check if there are low balance tokens to hide
  const hasLowBalanceTokens = useMemo(() => {
    if (!isHideLowBalance) {
      return false;
    }

    return searchedTokens.some((bal) => {
      if (!bal.priceUsd) {
        return false;
      }

      const valueUsd = calculateUsdValue(
        bal.token.amount,
        bal.token.currency.coinDecimals,
        bal.priceUsd,
      );
      return valueUsd < LOW_BALANCE_THRESHOLD_USD;
    });
  }, [searchedTokens, isHideLowBalance]);

  return (
    <>
      <div className={styles.searchBar}>
        <SearchIcon color="var(--fg-quaternary)" size={16} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search Assets or Chains"
          value={searchQuery}
          onChange={handleSearchChange}
          name="search-tokens"
        />
      </div>

      <div
        className={styles.hideLowBalance}
        onClick={() => setIsHideLowBalance(!isHideLowBalance)}
      >
        <span role="checkbox" className={styles.hideLowBalanceCheckbox}>
          <CheckCircleOutlinedIcon
            size={16}
            color={isHideLowBalance ? "#5BCCF1" : "var(--fg-quaternary)"}
          />
        </span>
        <Typography
          size="xs"
          weight="medium"
          color={isHideLowBalance ? "primary" : "placeholder"}
          tagType="label"
          className={styles.hideLowBalanceLabel}
        >
          Hide Low Balance
        </Typography>
      </div>

      <div className={styles.assetList}>
        {filteredTokens.map((asset) => (
          <TokenItem
            key={`${asset.chainInfo.chainId}-${asset.token.currency.coinMinimalDenom}`}
            tokenBalance={asset}
            address={asset.address}
          />
        ))}
        {filteredTokens.length === 0 && !isLoading && <EmptyState />}
      </div>
    </>
  );
};

const EmptyState: FC = () => {
  const emptyImage = `${S3_BUCKET_URL}/assets/oko_user_dashboard_assets_empty.webp`;
  const emptyImageAlt = `${S3_BUCKET_URL}/assets/oko_user_dashboard_assets_empty.png`;

  return (
    <div className={styles.emptyState}>
      <ImageWithAlt
        srcSet={emptyImage}
        srcAlt={emptyImageAlt}
        alt="Empty Assets Image"
        className={styles.emptyImage}
      />

      <Typography tagType="p" size="sm" weight="semibold" color="tertiary">
        No Assets Found
      </Typography>

      <Typography tagType="p" size="sm" weight="medium" color="quaternary">
        If you have assets but they're not appearing, please check if Hide Low{" "}
        Balance is turned on or if the chain is hidden in{" "}
        <ShowHideChainsModal
          renderTrigger={({ onOpen }) => (
            <span
              className={styles.showHideChainsLink}
              role="button"
              onClick={onOpen}
            >
              Show/Hide Chains
            </span>
          )}
        />
      </Typography>
    </div>
  );
};
