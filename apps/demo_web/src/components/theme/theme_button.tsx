import { Button } from "@oko-wallet/oko-common-ui/button";
import { MoonIcon } from "@oko-wallet/oko-common-ui/icons/moon_icon";
import { SunIcon } from "@oko-wallet/oko-common-ui/icons/sun_icon";
import { Tooltip } from "@oko-wallet/oko-common-ui/tooltip";

import styles from "./theme_button.module.scss";
import { useThemeState } from "@oko-wallet-demo-web/state/theme";

export const ThemeButton = () => {
  const theme = useThemeState((state) => state.theme);
  const setPreference = useThemeState((state) => state.setPreference);

  const handleThemeToggle = () => {
    setPreference(theme === "light" ? "dark" : "light");
  };

  return (
    <Tooltip
      title={theme === "light" ? "Light Mode" : "Dark Mode"}
      placement="right"
      className={styles.themeButtonContainer}
      backgroundColor="brand-solid"
      titleColor={theme === "light" ? "primary-on-brand" : undefined}
      titleCustomColor={theme === "dark" ? "gray-800" : undefined}
    >
      <Button
        size="md"
        variant="secondary"
        className={styles.themeButton}
        onClick={handleThemeToggle}
      >
        {theme === "light" ? (
          <SunIcon className={styles.themeButtonIcon} size={20} />
        ) : (
          <MoonIcon className={styles.themeButtonIcon} size={20} />
        )}
      </Button>
    </Tooltip>
  );
};
