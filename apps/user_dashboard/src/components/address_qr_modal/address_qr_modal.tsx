import { EthermintChainIdHelper } from "@keplr-wallet/cosmos";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { Card } from "@oko-wallet/oko-common-ui/card";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { QRCodeSVG } from "qrcode.react";
import { type FC, type ReactNode, useState } from "react";
import { createPortal } from "react-dom";

import { AddressChip } from "../address_chip/address_chip";
import styles from "./address_qr_modal.module.scss";
import type { ModularChainInfo } from "@oko-wallet-user-dashboard/types/chain";

interface AddressQrModalProps {
  renderTrigger: (props: { onOpen: () => void }) => ReactNode;
  chainInfo: ModularChainInfo;
  address: string;
  onOpenCallback?: () => void;
  onCloseCallback?: () => void;
}

export const AddressQrModal: FC<AddressQrModalProps> = ({
  renderTrigger,
  chainInfo,
  address,
  onOpenCallback,
  onCloseCallback,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const onOpen = () => {
    setIsOpen(true);
    onOpenCallback?.();
  };
  const onClose = () => {
    setIsOpen(false);
    onCloseCallback?.();
  };

  const isEthereumAddress = address.startsWith("0x");

  const addressQRdata = (() => {
    if (!address) {
      return "";
    }

    if (isEthereumAddress) {
      const evmChainId = chainInfo.evm
        ? chainInfo.evm.chainId
        : EthermintChainIdHelper.parse(chainInfo.chainId).ethChainId;

      if (evmChainId) {
        const hex = `0x${Number(evmChainId).toString(16)}`;
        return `ethereum:${address}@${hex}`;
      }
      return `ethereum:${address}`;
    }

    return address;
  })();

  const chainLogoUrl = chainInfo.chainSymbolImageUrl;

  const modalContent = isOpen && (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <Card className={styles.modalCard} variant="elevated" padding="none">
          <div className={styles.modalContent}>
            <div className={styles.header}>
              <Typography size="md" weight="semibold" color="primary">
                Copy Address
              </Typography>
              <button className={styles.closeButton} onClick={onClose}>
                <XCloseIcon size={20} />
              </button>
            </div>

            <div className={styles.chainInfo}>
              {chainLogoUrl ? (
                <img
                  src={chainLogoUrl}
                  alt={chainInfo.chainName}
                  className={styles.chainLogo}
                />
              ) : (
                <div
                  className={styles.chainLogo}
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                />
              )}
              <Typography size="sm" weight="medium" color="secondary">
                {chainInfo.chainName}
              </Typography>
            </div>

            <div className={styles.addressContainer}>
              <AddressChip
                address={address}
                isEthereumAddress={isEthereumAddress}
              />
            </div>

            <div className={styles.qrContainer}>
              <QRCodeSVG value={addressQRdata} size={200} />
            </div>

            <Button variant="secondary" size="lg" fullWidth onClick={onClose}>
              Close
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <>
      {renderTrigger({ onOpen })}
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
};
