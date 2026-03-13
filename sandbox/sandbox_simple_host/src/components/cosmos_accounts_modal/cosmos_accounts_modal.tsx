import { type FC, useMemo, useState } from "react";

import {
  type CosmosChainAccount,
  useCosmosAccounts,
} from "@/components/cosmos_accounts_modal/use_cosmos_accounts";
import styles from "./cosmos_accounts_modal.module.scss";

export interface CosmosAccountsModalProps {
  open: boolean;
  onClose: () => void;
  accounts?: CosmosChainAccount[];
}

export const CosmosAccountsModal: FC<CosmosAccountsModalProps> = ({
  open,
  onClose,
  accounts: accountsProp,
}) => {
  const [query, setQuery] = useState("");
  const { accounts, isLoading, error } = useCosmosAccounts();
  const data = accountsProp ?? accounts;

  const filtered = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    if (!loweredQuery) {
      return data;
    }
    return data.filter((account) => {
      return (
        account.chainId.toLowerCase().includes(loweredQuery) ||
        account.chainName.toLowerCase().includes(loweredQuery)
      );
    });
  }, [data, query]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p>Cosmos Accounts</p>
          <button
            type="button"
            className={styles.signOutButton}
            onClick={onClose}
          >
            <p>Close</p>
          </button>
        </div>

        <div className={styles.accountsHeaderRow}>
          <p className={styles.label}>Search</p>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search chain name or chain id"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.modalBody}>
          {isLoading ? (
            <p>Loading...</p>
          ) : error ? (
            <p>Error: {error}</p>
          ) : filtered.length === 0 ? (
            <p>No results</p>
          ) : (
            filtered.map((account) => (
              <div
                key={`${account.chainId}-${account.address}`}
                className={styles.accountItem}
              >
                <div className={styles.itemRow}>
                  <p className={styles.itemLabel}>Chain</p>
                  <p className={styles.itemValue}>
                    {account.chainName} ({account.chainId})
                  </p>
                </div>
                <div className={styles.itemRow}>
                  <p className={styles.itemLabel}>Address</p>
                  <p className={styles.itemValue}>{account.address}</p>
                </div>
                <div className={styles.itemRow}>
                  <p className={styles.itemLabel}>PubKey</p>
                  <p className={styles.itemValue}>
                    {Buffer.from(account.pubkey).toString("hex")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
