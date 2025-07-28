import React, { type ReactElement } from "react";
import { Button } from "@keplr-ewallet/ewallet-common-ui/button";
import { InfoCircleIcon } from "@keplr-ewallet/ewallet-common-ui/icons/info_circle";
import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import { Widget } from "@keplr-ewallet-demo-web/components/widgets/widget_components";
import styles from "./sign_widget.module.scss";

export const SignWidget: React.FC<SignWidgetProps> = ({
  chain,
  chainIcon,
  signType,
  signButtonOnClick,
  isLoading,
}) => {
  const signTitle =
    signType === "offchain"
      ? "Sign an Offchain Message"
      : "Sign an Onchain Message";

  return (
    <Widget>
      <div className={styles.container}>
        <div className={styles.titleRow}>
          <div className={styles.chainBadge}>
            {chainIcon}
            <Typography
              tagType="span"
              size="xs"
              weight="medium"
              color="secondary"
            >
              {chain}
            </Typography>
          </div>
          <Typography
            tagType="span"
            size="sm"
            weight="semibold"
            color="secondary"
            className={styles.titleText}
          >
            {signTitle}
          </Typography>
        </div>

        {isLoading ? (
          <div className={styles.loading}>Signing...</div>
        ) : (
          <Description signType={signType} />
        )}

        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={signButtonOnClick}
        >
          Sign
        </Button>
      </div>
    </Widget>
  );
};

const Description = ({ signType }: { signType: SignType }) => {
  return (
    <>
      {signType === "offchain" && (
        <Typography
          tagType="div"
          size="sm"
          weight="medium"
          color="tertiary"
          className={styles.infoBox}
        >
          <p className={styles.infoParagraph}>
            <InfoCircleIcon />
            <span>Why use offchain signatures?</span>
          </p>
          <ul className={styles.infoList}>
            <li>Prove wallet ownership</li>
            <li>Authenticate without gas fees</li>
            <li>No transaction is sent on-chain</li>
          </ul>
        </Typography>
      )}
      {signType === "onchain" && (
        <Typography
          tagType="div"
          size="sm"
          weight="medium"
          color="tertiary"
          className={styles.onchainTest}
        >
          <p>This is a demo ✨</p>
          <p>No transaction will be sent on-chain.</p>
        </Typography>
      )}
    </>
  );
};

export interface SignWidgetProps {
  chain: string;
  chainIcon: ReactElement;
  signType: SignType;
  signButtonOnClick: () => void;
  isLoading?: boolean;
}

type SignType = "offchain" | "onchain";
