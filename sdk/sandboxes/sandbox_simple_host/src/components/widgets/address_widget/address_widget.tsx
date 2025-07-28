import React, { useState } from "react";
import { CosmosIcon } from "@keplr-ewallet/ewallet-common-ui/icons/cosmos_icon";
import { EthereumIcon } from "@keplr-ewallet/ewallet-common-ui/icons/ethereum_icon";
import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import styles from "./address_widget.module.scss";
import { Widget } from "../widget_components";
import { AddressRow } from "./address_row";
import { ViewChainsButton } from "./view_chains_button";
import { ViewChainsModal } from "./view_chains_modal";

export const AddressWidget: React.FC<AddressWidgetProps> = ({}) => {
  const [showModal, setShowModal] = useState(false);

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
          <Typography
            size="sm"
            weight="semibold"
            color="secondary"
            className={styles.title}
          >
            Wallet Address
          </Typography>
          <AddressRow icon={<EthereumIcon />} chain="ethereum" />
          <AddressRow icon={<CosmosIcon />} chain="cosmos" />
          <ViewChainsButton onClick={handleViewChains} />
        </div>
      </Widget>

      {showModal && <ViewChainsModal onClose={handleCloseModal} />}
    </>
  );
};

export interface AddressWidgetProps {}
