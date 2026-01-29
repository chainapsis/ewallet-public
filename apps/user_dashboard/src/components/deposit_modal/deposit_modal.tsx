"use client";

import { Card } from "@oko-wallet/oko-common-ui/card";
import { Dropdown } from "@oko-wallet/oko-common-ui/dropdown";
import { ChevronDownIcon } from "@oko-wallet/oko-common-ui/icons/chevron_down";
import { SearchIcon } from "@oko-wallet/oko-common-ui/icons/search";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import {
  type ChangeEvent,
  type FC,
  type ReactNode,
  useMemo,
  useState,
} from "react";

import { AddressItem } from "./components/address_item";
import styles from "./deposit_modal.module.scss";
import { SearchEmptyView } from "@oko-wallet-user-dashboard/components/search_empty_view";
import { useEnabledChains } from "@oko-wallet-user-dashboard/hooks/queries";
import {
  useBech32Addresses,
  useEthAddress,
  useSolanaAddress,
} from "@oko-wallet-user-dashboard/hooks/queries/use_addresses";
import { useSearch } from "@oko-wallet-user-dashboard/hooks/use_search";
import {
  DEFAULT_ENABLED_CHAINS,
  getChainIdentifier,
} from "@oko-wallet-user-dashboard/state/chains";
import type { ModularChainInfo } from "@oko-wallet-user-dashboard/types/chain";
import { isCosmosChainId } from "@oko-wallet-user-dashboard/utils/chain";

const ecosystemFilterOptions = [
  "All Chains",
  "Cosmos",
  "EVM",
  "Solana",
] as const;
type EcosystemFilter = (typeof ecosystemFilterOptions)[number];

interface DepositModalProps {
  renderTrigger: (props: { onOpen: () => void }) => ReactNode;
}

export const DepositModal: FC<DepositModalProps> = ({ renderTrigger }) => {
  const { chains: enabledChains } = useEnabledChains();

  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false); // Note: hide modal when qr modal is open
  const [searchQuery, setSearchQuery] = useState("");
  const [ecosystem, setEcosystem] = useState<EcosystemFilter>("All Chains");

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  const hideModal = () => setIsHidden(true);
  const showModal = () => setIsHidden(false);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const searchFields = ["chainName"];

  // Get enabled chains with cosmos, evm, or solana modules
  const visibleChains = useMemo(() => {
    return enabledChains.filter(
      (chain) => chain.cosmos || chain.evm || chain.solana,
    );
  }, [enabledChains]);

  // Get addresses using TanStack Query hooks
  const { address: ethAddress } = useEthAddress();
  const { address: solanaAddress } = useSolanaAddress();
  const cosmosChainIds = useMemo(
    () =>
      visibleChains
        .filter((chain) => isCosmosChainId(chain.chainId))
        .map((chain) => chain.chainId),
    [visibleChains],
  );
  const { addresses: bech32Addresses } = useBech32Addresses(cosmosChainIds);

  const searchedChainInfos = useSearch(
    visibleChains,
    searchQuery,
    searchFields,
  );

  const filteredChainInfos = useMemo(() => {
    const defaultChainOrder = new Map<string, number>(
      DEFAULT_ENABLED_CHAINS.map((id, index) => [id, index]),
    );

    return searchedChainInfos
      .filter((chain) => {
        switch (ecosystem) {
          case "All Chains":
            return true;
          case "Cosmos":
            return !!chain.cosmos;
          case "EVM":
            return !!chain.evm;
          case "Solana":
            return !!chain.solana;
          default:
            throw new Error("unreachable");
        }
      })
      .sort((a, b) => {
        // Default chains first, in order
        const aDefaultIndex = defaultChainOrder.get(
          getChainIdentifier(a.chainId),
        );
        const bDefaultIndex = defaultChainOrder.get(
          getChainIdentifier(b.chainId),
        );
        const aIsDefault = aDefaultIndex !== undefined;
        const bIsDefault = bDefaultIndex !== undefined;

        if (aIsDefault && bIsDefault) {
          return aDefaultIndex - bDefaultIndex;
        }
        if (aIsDefault && !bIsDefault) {
          return -1;
        }
        if (!aIsDefault && bIsDefault) {
          return 1;
        }
        return a.chainName.localeCompare(b.chainName);
      });
  }, [searchedChainInfos, ecosystem]);

  const getAddressForChain = (
    chain: ModularChainInfo,
  ): string | undefined => {
    if (chain.evm) {
      return ethAddress === null ? undefined : ethAddress;
    }
    if (chain.solana) {
      return solanaAddress === null ? undefined : solanaAddress;
    }
    return bech32Addresses[chain.chainId];
  };

  return (
    <>
      {renderTrigger({ onOpen })}

      {isOpen && (
        /* biome-ignore lint/a11y/noStaticElementInteractions: for mouse user convenience */
        <div
          className={cn(styles.modalBackground, {
            [styles.hidden]: isHidden,
          })}
          onClick={onClose}
        >
          <div
            className={styles.modal}
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <Card
              className={styles.modalCard}
              variant="elevated"
              padding="none"
            >
              <div className={styles.modalContent}>
                <div className={styles.header}>
                  <Typography size="md" weight="semibold" color="primary">
                    Deposit
                  </Typography>
                  <button
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Close modal"
                    type="button"
                  >
                    <XCloseIcon color="var(--fg-quaternary)" size={20} />
                  </button>
                </div>

                <div className={styles.searchBar}>
                  <SearchIcon color="var(--fg-quaternary)" size={16} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search Chains"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    name="search-chains"
                  />
                </div>
              </div>

              <Typography size="sm" weight="semibold" color="secondary">
                Filters
              </Typography>
              <Spacing height={8} />

              <div className={styles.filterWrapper}>
                <Dropdown>
                  <Dropdown.Trigger asChild>
                    <div className={styles.dropdownTrigger}>
                      <Typography size="sm" color="secondary" weight="semibold">
                        {ecosystem}
                      </Typography>
                      <ChevronDownIcon color="var(--fg-quaternary)" size={20} />
                    </div>
                  </Dropdown.Trigger>
                  <Dropdown.Content className={styles.dropdownContent}>
                    {ecosystemFilterOptions.map((option) => (
                      <Dropdown.Item
                        key={option}
                        onClick={() => setEcosystem(option)}
                      >
                        {option}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Content>
                </Dropdown>
              </div>

              <div className={cn(styles.chainList, "common-list-scroll")}>
                {filteredChainInfos.length > 0 ? (
                  filteredChainInfos.map((chain) => (
                    <AddressItem
                      key={chain.chainId}
                      chainInfo={chain}
                      address={getAddressForChain(chain)}
                      onQrModalOpen={hideModal}
                      onQrModalClose={showModal}
                    />
                  ))
                ) : (
                  <SearchEmptyView />
                )}
              </div>

              <Spacing height={8} />
            </Card>
          </div>
        </div>
      )}
    </>
  );
};
