import { CheckCircleOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/check_circle_outlined";
import { CopyOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/copy_outlined";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, type MouseEvent, useMemo } from "react";

import styles from "./address_chip.module.scss";
import { useCopyToClipboard } from "@oko-wallet-user-dashboard/hooks/use_copy_to_clipboard";

interface AddressChipProps {
  address: string;
  isEthereumAddress: boolean;
  className?: string;
}

export const AddressChip: FC<AddressChipProps> = ({
  address,
  isEthereumAddress,
  className,
}) => {
  const { isCopied, copy } = useCopyToClipboard();

  const displayAddress = useMemo(() => {
    if (!address) {
      return { former: "", middle: "", latter: "" };
    }

    const LENGTH_OF_FIRST_PART = 10;
    const LENGTH_OF_LAST_PART = 6;

    if (isEthereumAddress) {
      return {
        former: address.slice(0, LENGTH_OF_FIRST_PART),
        middle: address.slice(
          LENGTH_OF_FIRST_PART,
          address.length - LENGTH_OF_LAST_PART,
        ),
        latter: address.slice(address.length - LENGTH_OF_LAST_PART),
      };
    }
    return {
      former: address.slice(0, LENGTH_OF_FIRST_PART),
      middle: address.slice(
        LENGTH_OF_FIRST_PART,
        address.length - LENGTH_OF_LAST_PART,
      ),
      latter: address.slice(address.length - LENGTH_OF_LAST_PART),
    };
  }, [address]);

  const handleCopy = (e: MouseEvent) => {
    e.stopPropagation();
    copy(address);
  };

  return (
    <div
      className={`${styles.container} ${className || ""}`}
      onClick={handleCopy}
    >
      <div className={styles.addressText}>
        <Typography size="sm" className={styles.former}>
          {displayAddress.former}
        </Typography>
        <Typography size="sm" className={styles.middle}>
          {displayAddress.middle}
        </Typography>
        <Typography size="sm" className={styles.latter}>
          {displayAddress.latter}
        </Typography>
      </div>

      <div className={styles.iconContainer}>
        {isCopied ? (
          <CheckCircleOutlinedIcon
            size={16}
            color="var(--fg-success-primary)"
          />
        ) : (
          <CopyOutlinedIcon size={16} color="var(--fg-tertiary)" />
        )}
      </div>
    </div>
  );
};
