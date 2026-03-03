import type { FC } from "react";
import { CheckIcon } from "@oko-wallet/oko-common-ui/icons/check_icon";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { CustomerTheme } from "@oko-wallet/oko-types/customers";

import styles from "./theme_button.module.scss";

const LightTheme: FC = () => {
  return (
    <div className={styles.lightThemeButton}>
      <div className={styles.lightThemeButtonInner}>
        <Typography
          className={styles.lightThemeButtonInnerText}
          size="sm"
          weight="semibold"
          color="primary"
        >
          Aa
        </Typography>
      </div>
    </div>
  );
};

const DarkTheme: FC = () => {
  return (
    <div className={styles.darkThemeButton}>
      <div className={styles.darkThemeButtonInner}>
        <Typography
          className={styles.darkThemeButtonInnerText}
          size="sm"
          weight="semibold"
        >
          Aa
        </Typography>
      </div>
    </div>
  );
};

const SystemThemeButton: FC = () => {
  return (
    <div className={styles.systemThemeButtonContainer}>
      <div className={styles.lightThemeButton}>
        <div className={styles.lightThemeButtonInner}>
          <Typography
            className={styles.lightThemeButtonInnerText}
            size="sm"
            weight="semibold"
            color="primary"
          >
            Aa
          </Typography>
        </div>
      </div>

      <div className={styles.darkThemeButton}>
        <div className={styles.darkThemeButtonInner}>
          <Typography
            className={styles.darkThemeButtonInnerText}
            size="sm"
            weight="semibold"
          >
            Aa
          </Typography>
        </div>
      </div>
    </div>
  );
};

interface ThemeButtonProps {
  theme: CustomerTheme;
  onClick: () => void;
  active: boolean;
  label: string;
}
export const ThemeButton: FC<ThemeButtonProps> = ({
  theme,
  onClick,
  active,
  label,
}) => {
  const themeButton = (() => {
    switch (theme) {
      case "light":
        return <LightTheme />;
      case "dark":
        return <DarkTheme />;
      case "system":
        return <SystemThemeButton />;
    }
  })();

  return (
    <div className={styles.buttonContainer}>
      <button
        className={`${styles.button} ${active ? styles.active : ""}`}
        onClick={onClick}
      >
        {themeButton}
        {active && (
          <div className={styles.activeIndicator}>
            <CheckIcon size={12} color="var(--fg-white)" />
          </div>
        )}
      </button>

      <Typography size="sm" weight="medium" color="secondary">
        {label}
      </Typography>
    </div>
  );
};
