import type { Theme } from "@oko-wallet/oko-common-ui/theme";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./sign_with_oko_box.module.scss";
import { useMobileMode } from "@oko-wallet-attached/hooks/mobile_mode";
import { OkoLogoWithNameIcon } from "@oko-wallet-common-ui/icons/oko_logo_with_name_icon";

export const SignWithOkoBox: FC<SignWithOkoBoxProps> = ({
  theme,
  hideText,
}) => {
  const isMobile = useMobileMode();

  return (
    <div className={styles.container}>
      {!hideText && (
        <Typography
          size={isMobile ? "sm" : "xs"}
          color="quaternary"
          weight="medium"
        >
          Sign with
        </Typography>
      )}
      <div className={styles.logoContainer}>
        <OkoLogoWithNameIcon
          width={isMobile ? 52 : 39}
          height={isMobile ? 20 : 16}
          theme={theme}
        />
      </div>
    </div>
  );
};

export interface SignWithOkoBoxProps {
  theme: Theme | null;
  hideText?: boolean;
}
