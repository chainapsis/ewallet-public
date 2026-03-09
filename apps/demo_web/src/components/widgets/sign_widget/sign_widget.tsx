import { type ReactElement, useState, useRef, useEffect, type FC } from "react";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { CheckCircleOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/check_circle_outlined";
import { LoadingIcon } from "@oko-wallet/oko-common-ui/icons/loading";
import { Typography } from "@oko-wallet/oko-common-ui/typography";

import styles from "./sign_widget.module.scss";

type SignStep = "initial" | "loading" | "success" | "error";

export const SignWidget: FC<SignWidgetProps> = ({
  chain,
  chainIcon,
  badge,
  signButtonOnClick,
  renderBottom,
}) => {
  const [signResult, setSignResult] = useState<SignStep>("initial");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSignClick = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setSignResult("loading");

    try {
      await signButtonOnClick();
      setSignResult("success");
      timeoutRef.current = setTimeout(() => {
        setSignResult("initial");
      }, 2000);
    } catch (error) {
      console.error("Sign failed:", error);
      setSignResult("initial");
    }
  };

  return (
    <>
      <div className={styles.row}>
        <div className={styles.chainInfo}>
          <div className={styles.chainIcon}>{chainIcon}</div>
          <Typography
            tagType="span"
            size="md"
            weight="semibold"
            color="secondary"
          >
            {chain}
          </Typography>
          {badge}
        </div>

        {signResult === "success" ? (
          <div className={styles.successInline}>
            <CheckCircleOutlinedIcon color="var(--fg-success-primary)" />
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSignClick}
            disabled={signResult === "loading"}
          >
            {signResult === "loading" ? (
              <LoadingIcon
                className={styles.loadingIcon}
                color="var(--fg-brand-primary)"
                backgroundColor="var(--bg-tertiary)"
              />
            ) : (
              "Sign"
            )}
          </Button>
        )}
      </div>

      {renderBottom?.()}
    </>
  );
};

export interface SignWidgetProps {
  chain: string;
  chainIcon: ReactElement;
  badge?: ReactElement;
  signType: SignType;
  signButtonOnClick: () => Promise<void>;
  renderBottom?: () => ReactElement;
}

export type SignType = "offchain" | "onchain";
