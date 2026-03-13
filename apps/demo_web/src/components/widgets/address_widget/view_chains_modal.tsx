import type { ChainInfo } from "@keplr-wallet/types";
import { SearchIcon } from "@oko-wallet/oko-common-ui/icons/search";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import { type FC, useState } from "react";

import { ChainsRow } from "./chains_row";
import styles from "./view_chains_modal.module.scss";

export const ViewChainsModal: FC<ViewChainsModalProps> = ({
  onClose,
  chains,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChains = (() => {
    if (!chains) {
      return [];
    }

    if (!searchQuery.trim()) {
      return chains;
    }

    const query = searchQuery.toLowerCase().trim();
    return chains.filter(
      (chain) =>
        chain.chainName.toLowerCase().includes(query) ||
        chain.chainId.toLowerCase().includes(query),
    );
  })();

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <Typography
            tagType="h3"
            size="sm"
            weight="semibold"
            color="secondary"
          >
            View Supported Chains
          </Typography>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            <XCloseIcon />
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.searchBar}>
            <div className={styles.searchIconWrap}>
              <SearchIcon />
            </div>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search chains..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <Typography size="xs" weight="medium" color="brand-secondary">
            {filteredChains.length} Chains
          </Typography>
          {filteredChains.length > 0 ? (
            <div className={cn(styles.chainsList, "common-list-scroll")}>
              {filteredChains.map((chain) => (
                <ChainsRow
                  key={chain.chainId}
                  chainName={chain.chainName}
                  icon={
                    chain.chainSymbolImageUrl ? (
                      <img
                        src={chain.chainSymbolImageUrl}
                        alt={chain.chainName}
                        width={24}
                        height={24}
                        className={styles.chainIcon}
                      />
                    ) : (
                      <div className={styles.fallbackIcon}>
                        {chain.chainName.charAt(0).toUpperCase()}
                      </div>
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className={styles.noChains}>
              {searchQuery.trim()
                ? `No chains found for "${searchQuery}"`
                : "No chains found"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export interface ViewChainsModalProps {
  onClose: () => void;
  chains?: ChainInfo[];
}
