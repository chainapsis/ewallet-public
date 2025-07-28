import React from "react";
import { EthereumIcon } from "@keplr-ewallet/ewallet-common-ui/icons/ethereum_icon";
import { CosmosIcon } from "@keplr-ewallet/ewallet-common-ui/icons/cosmos_icon";
import { SearchIcon } from "@keplr-ewallet/ewallet-common-ui/icons/search";
import { XCloseIcon } from "@keplr-ewallet/ewallet-common-ui/icons/x_close";
import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import styles from "./view_chains_modal.module.scss";
import { ChainsRow } from "./chains_row";

const CHAINS = [
  { name: "Ethereum", icon: <EthereumIcon width={24} height={24} /> },
  { name: "ChainName", icon: <CosmosIcon width={24} height={24} /> },
  { name: "Bitcoin", icon: <CosmosIcon width={24} height={24} /> },
  { name: "Ripple", icon: <CosmosIcon width={24} height={24} /> },
  { name: "Litecoin", icon: <CosmosIcon width={24} height={24} /> },
  { name: "Cardano", icon: <CosmosIcon width={24} height={24} /> },
  { name: "Polkadot", icon: <CosmosIcon width={24} height={24} /> },
  { name: "Solana", icon: <CosmosIcon width={24} height={24} /> },
];

export const ViewChainsModal: React.FC<ViewChainsModalProps> = ({
  onClose,
}) => {
  return (
    <div className={styles.modalOverlay}>
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
          <button className={styles.closeButton} onClick={onClose}>
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
              placeholder="Search"
            />
          </div>
          <div className={styles.chainsList}>
            {CHAINS.map((chain) => (
              <ChainsRow
                key={chain.name}
                chainName={chain.name}
                icon={chain.icon}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export interface ViewChainsModalProps {
  onClose: () => void;
}
