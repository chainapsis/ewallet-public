import React, { type ReactElement } from "react";

import styles from "./sign_widget.module.scss";
import { Widget } from "@/components/widgets/widget_components";

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
            <p>{chain}</p>
          </div>
          <p>{signTitle}</p>
        </div>

        {isLoading ? (
          <div className={styles.loading}>Signing...</div>
        ) : (
          <Description signType={signType} />
        )}

        <button onClick={signButtonOnClick}>Sign</button>
      </div>
    </Widget>
  );
};

const Description = ({ signType }: { signType: SignType }) => {
  return (
    <>
      {signType === "offchain" && (
        <div className={styles.infoBox}>
          <p className={styles.infoParagraph}>
            <span>Why use offchain signatures?</span>
          </p>
          <ul className={styles.infoList}>
            <li>Prove wallet ownership</li>
            <li>Authenticate without gas fees</li>
            <li>No transaction is sent on-chain</li>
          </ul>
        </div>
      )}
      {signType === "onchain" && (
        <div className={styles.onchainTest}>
          <p>This is a demo ✨</p>
          <p>No transaction will be sent on-chain.</p>
        </div>
      )}
    </>
  );
};

export interface SignWidgetProps {
  chain: string;
  chainIcon?: ReactElement;
  signType: SignType;
  signButtonOnClick: () => void;
  isLoading?: boolean;
}

type SignType = "offchain" | "onchain";
