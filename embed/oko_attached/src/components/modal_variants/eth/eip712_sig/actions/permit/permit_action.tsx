import { ArrowUpRightIcon } from "@oko-wallet/oko-common-ui/icons/arrow_up_right";
import { Skeleton } from "@oko-wallet/oko-common-ui/skeleton";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Tooltip } from "@oko-wallet/oko-common-ui/tooltip";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, Fragment } from "react";
import type { Address, Chain, TypedDataDefinition } from "viem";
import { createPublicClient, getAddress, http, stringify } from "viem";

import styles from "./permit_action.module.scss";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { Collapsible } from "@oko-wallet-attached/components/collapsible/collapsible";
import { MakeSignatureRawCodeBlock } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block";
import { MakeSignatureRawCodeBlockContainer } from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_sig_modal_code_block_container";
import { useGetTokenMetadata } from "@oko-wallet-attached/web3/ethereum/queries";
import { formatTokenAmount } from "@oko-wallet-attached/web3/ethereum/utils";

export interface PermitActionProps {
  spender: Address;
  tokenAddress: Address;
  amount: string | bigint;
  typedData: TypedDataDefinition;
  chain: Chain;
  tokenLogoURI?: string;
}

export const PermitAction: FC<PermitActionProps> = ({
  spender,
  tokenAddress,
  amount,
  typedData,
  chain,
  tokenLogoURI,
}) => {
  // TODO: minimize the number of public clients created
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const blockExplorerUrl = chain.blockExplorers?.default.url;

  const { data: getTokenMetadataResult, isLoading: isTokenMetadataLoading } =
    useGetTokenMetadata({
      tokenAddress: tokenAddress,
      isERC20: true,
      client: publicClient,
    });

  const tokenMetadata = {
    name: getTokenMetadataResult?.name ?? undefined,
    symbol: getTokenMetadataResult?.symbol ?? undefined,
    decimals: getTokenMetadataResult?.decimals ?? undefined,
  };

  const formatted = formatTokenAmount(BigInt(amount), tokenMetadata);

  function handleOpenExplorerLink() {
    if (blockExplorerUrl) {
      window.open(`${blockExplorerUrl}/address/${spender}`, "_blank");
    }
  }

  function formatAddress(address: Address): string {
    const normalizedAddress = getAddress(address);
    return `${normalizedAddress.slice(0, 9)}...${normalizedAddress.slice(-9)}`;
  }

  return (
    <Fragment>
      <div className={styles.summaryContainer}>
        <div className={styles.summaryItem}>
          <Typography color="secondary" size="xs" weight="semibold">
            Approve
          </Typography>
          {blockExplorerUrl ? (
            <div
              className={styles.textWithExternalLink}
              onClick={handleOpenExplorerLink}
            >
              <Typography
                color="tertiary"
                size="sm"
                weight="medium"
                className={styles.externalLink}
              >
                {formatAddress(spender)}
              </Typography>
              <ArrowUpRightIcon className={styles.arrowUpRightIcon} />
            </div>
          ) : (
            <Typography color="tertiary" size="sm" weight="medium">
              {formatAddress(spender)}
            </Typography>
          )}
        </div>
        <div className={styles.summaryItem}>
          <Typography
            color="secondary"
            size="sm"
            weight="semibold"
            className={styles.noShrink}
          >
            to use up to
          </Typography>
          {isTokenMetadataLoading ? (
            <div className={styles.textWithIcon}>
              <Skeleton width="16px" height="16px" borderRadius="999px" />
              <Skeleton width="100px" height="20px" />
            </div>
          ) : (
            <div className={styles.textWithIcon}>
              <Avatar
                src={tokenLogoURI}
                alt={tokenMetadata?.name ?? "unknown"}
                size="sm"
                variant="rounded"
              />
              {formatted.isTruncated ? (
                <Tooltip content={formatted.full} placement="bottom">
                  <Typography
                    color="tertiary"
                    size="sm"
                    weight="medium"
                    className={styles.tokenAmount}
                  >
                    {formatted.display}
                  </Typography>
                </Tooltip>
              ) : (
                <Typography
                  color="tertiary"
                  size="sm"
                  weight="medium"
                  className={styles.tokenAmount}
                >
                  {formatted.display}
                </Typography>
              )}
            </div>
          )}
        </div>
      </div>
      <Spacing height={12} />
      <Collapsible title="Message" className={styles.collapsibleCodeBlock}>
        <MakeSignatureRawCodeBlockContainer variant="embedded">
          <MakeSignatureRawCodeBlock
            code={stringify(typedData, null, 2)}
            variant="embedded"
          />
        </MakeSignatureRawCodeBlockContainer>
      </Collapsible>
    </Fragment>
  );
};
