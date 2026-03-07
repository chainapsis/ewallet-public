import { CosmosIcon } from "@oko-wallet/oko-common-ui/icons/cosmos_icon";
import { EthereumBlueIcon } from "@oko-wallet/oko-common-ui/icons/ethereum_blue_icon";
import { SolanaIcon } from "@oko-wallet/oko-common-ui/icons/solana_icon";
import { WalletIcon } from "@oko-wallet/oko-common-ui/icons/wallet";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useState } from "react";

import { Widget } from "../widget_components";
import { AddressRow } from "./address_row";
import styles from "./address_widget.module.scss";
import { ViewChainsButton } from "./view_chains_button";
import { ViewChainsModal } from "./view_chains_modal";
import { useGetChainInfos } from "@oko-wallet-demo-web/hooks/use_get_chain_infos";
import { useAddresses } from "@oko-wallet-demo-web/hooks/wallet";

export const AddressWidget: FC<AddressWidgetProps> = ({}) => {
  const [showModal, setShowModal] = useState(false);
  const { cosmosAddress, ethAddress, solanaAddress } = useAddresses();

  const { data: chains } = useGetChainInfos();

  const formatAddress = (address: string | null) => {
    if (!address) {
      return undefined;
    }
    return address;
  };

  const handleViewChains = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <Widget>
        <div className={styles.container}>
          <div className={styles.title}>
            <WalletIcon size={16} color="#ED6B25" />
            <Typography size="md" weight="semibold" color="secondary">
              Wallet Address
            </Typography>
          </div>

          <AddressRow
            icon={<EthereumBlueIcon />}
            chain="ethereum"
            address={formatAddress(ethAddress)}
          />
          <Spacing height={12} />

          <AddressRow
            icon={<CosmosIcon />}
            chain="cosmos"
            address={formatAddress(cosmosAddress)}
          />
          <Spacing height={12} />

          <AddressRow
            icon={<SolanaIcon />}
            chain="solana"
            address={formatAddress(solanaAddress)}
          />
          <Spacing height={12} />

          <ViewChainsButton onClick={handleViewChains} />
        </div>
      </Widget>

      {showModal && (
        <ViewChainsModal onClose={handleCloseModal} chains={chains} />
      )}
    </>
  );
};

export interface AddressWidgetProps {}
