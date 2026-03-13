import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";
import type { Address } from "viem";

import styles from "./address_info.module.scss";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { convertIpfsUrl } from "@oko-wallet-attached/utils/url";
import {
  useGetENSAvatar,
  useGetENSName,
} from "@oko-wallet-attached/web3/ethereum/queries";

export interface AddressInfoProps {
  address: Address;
}

export const AddressInfo: FC<AddressInfoProps> = ({ address }) => {
  const { data: ensName, isLoading: ensNameIsLoading } = useGetENSName({
    address,
  });

  // NOTE: can ignore the loading state here
  // as the ens avatar is not critical and ipfs may cause 502 gateway error
  const { data: ensAvatar } = useGetENSAvatar({
    name: ensName as string | undefined,
  });

  if (ensNameIsLoading) {
    return <Skeleton width="220px" height="20px" />;
  }

  return (
    <div className={styles.addressInfo}>
      {ensName ? (
        <Avatar
          src={ensAvatar ? convertIpfsUrl(ensAvatar) : undefined}
          alt={ensName ?? "unknown"}
          size="sm"
          variant="rounded"
        />
      ) : null}
      <Typography
        color="secondary"
        size="sm"
        weight="medium"
        className={styles.address}
      >
        {ensName || address}
      </Typography>
    </div>
  );
};
