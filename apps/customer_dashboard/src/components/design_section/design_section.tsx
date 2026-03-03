"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { CustomerTheme } from "@oko-wallet/oko-types/customers";
import { useQueryClient } from "@tanstack/react-query";
import { type FC, useLayoutEffect, useState } from "react";

import styles from "./design_section.module.scss";
import { ThemeButton } from "./theme_button";
import { displayToast } from "@oko-wallet-ct-dashboard/components/toast";
import { requestUpdateCustomerInfo } from "@oko-wallet-ct-dashboard/fetch/customers";
import { useCustomerInfo } from "@oko-wallet-ct-dashboard/hooks/use_customer_info";
import { useAppState } from "@oko-wallet-ct-dashboard/state";

const THEME_OPTIONS: CustomerTheme[] = ["light", "dark", "system"];

export const DesignSection: FC = () => {
  const queryClient = useQueryClient();
  const customer = useCustomerInfo();
  const token = useAppState((state) => state.token);
  const [savedTheme, setSavedTheme] = useState<CustomerTheme>(
    customer.data?.theme ?? "system",
  );
  const [draftTheme, setDraftTheme] = useState<CustomerTheme>(
    customer.data?.theme ?? "system",
  );

  useLayoutEffect(() => {
    if (customer.data?.theme) {
      setSavedTheme(customer.data.theme);
      setDraftTheme(customer.data.theme);
    }
  }, [customer.data?.theme]);

  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [hasTouched, setHasTouched] = useState(false);

  const hasThemeChange = draftTheme !== savedTheme;

  const handleThemeSelect = (option: CustomerTheme) => {
    if (isSavingTheme) {
      return;
    }

    setThemeError(null);
    setDraftTheme(option);
    if (option !== savedTheme) {
      setHasTouched(true);
    }
  };

  const handleThemeCancel = () => {
    if (isSavingTheme) {
      return;
    }

    setThemeError(null);
    setDraftTheme(savedTheme);
    setHasTouched(false);
  };

  const handleThemeSave = async () => {
    if (!hasThemeChange || isSavingTheme) {
      return;
    }

    if (!token) {
      setThemeError("Please log in to continue.");
      return;
    }

    setIsSavingTheme(true);
    setThemeError(null);

    try {
      const result = await requestUpdateCustomerInfo({
        token,
        theme: draftTheme,
      });

      if (result.success) {
        setSavedTheme(draftTheme);
        setHasTouched(false);
        displayToast({
          variant: "success",
          title: "Saved!",
        });
        await queryClient.invalidateQueries({ queryKey: ["customer"] });
      } else {
        setThemeError(result.msg ?? "Failed to update theme.");
      }
    } catch (err) {
      setThemeError("An error occurred while updating the theme.");
    } finally {
      setIsSavingTheme(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div>
        <Typography size="display-xs" weight="semibold" color="primary">
          Design
        </Typography>

        <Spacing height={8} />

        <Typography size="md" weight="medium" color="quaternary">
          You can configure the Oko UI theme integrated into your app.
        </Typography>
      </div>
      <div className={styles.themeSection}>
        <div className={styles.themeOptions}>
          {THEME_OPTIONS.map((option) => {
            const label =
              option === "system"
                ? "System"
                : option === "light"
                  ? "Light"
                  : "Dark";

            return (
              <ThemeButton
                key={option}
                theme={option}
                onClick={() => handleThemeSelect(option)}
                active={draftTheme === option}
                label={label}
              />
            );
          })}
        </div>

        <div
          className={`${styles.themeActionsWrapper}${hasTouched ? ` ${styles.visible}` : ""}`}
        >
          <div className={styles.themeActions}>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleThemeSave}
              disabled={!hasThemeChange}
              isLoading={isSavingTheme}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleThemeCancel}
              disabled={isSavingTheme}
            >
              Cancel
            </Button>
          </div>
        </div>

        {themeError && <div className={styles.error}>{themeError}</div>}
      </div>
    </div>
  );
};
