import { type FC, useState } from "react";

import { Widget } from "../widget_components";
import styles from "./address_widget.module.scss";
import { ViewChainsButton } from "./view_chains_button";
import { ViewChainsModal } from "./view_chains_modal";

export const AddressWidget: FC<AddressWidgetProps> = () => {
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
          <p>Wallet Address</p>
          <ViewChainsButton onClick={handleViewChains} />
        </div>
      </Widget>

      {showModal && <ViewChainsModal onClose={handleCloseModal} />}
    </>
  );
};

// biome-ignore lint/complexity/noBannedTypes: empty props type
export type AddressWidgetProps = {};
