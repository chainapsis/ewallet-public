"use client";

import { Card } from "@oko-wallet/oko-common-ui/card";
import { Checkbox } from "@oko-wallet/oko-common-ui/checkbox";
import { Input } from "@oko-wallet/oko-common-ui/input";
import { Logo } from "@oko-wallet/oko-common-ui/logo";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import Link from "next/link";
import type { FC } from "react";

import styles from "./sign_in_form.module.scss";
import { useSignInForm } from "./use_sign_in_form";
import { PASSWORD_MAX_LENGTH } from "@oko-wallet-ct-dashboard/constants";
import { AccountForm } from "@oko-wallet-ct-dashboard/ui";

export const SignInForm: FC = () => {
  const {
    onSubmit,
    register,
    errors,
    isLoading,
    isValid,
    saveEmail,
    resetErrors,
    handleSaveEmailChange,
  } = useSignInForm();

  return (
    <Card className={styles.loginCard} variant="elevated" padding="lg">
      <div className={styles.cardHeader}>
        {/* NOTE: theme is hardcoded to light for now */}
        <Logo theme={"light"} />
      </div>

      <AccountForm
        onSubmit={onSubmit}
        disabled={isLoading || !isValid}
        submitText={isLoading ? "Signing in..." : "Login"}
      >
        <Input
          label="Email"
          type="email"
          placeholder="Email"
          fullWidth
          error={errors.email?.message}
          resetError={() => resetErrors("email")}
          {...register("email")}
        />

        <Spacing height={20} />

        <Input
          label="Password"
          type="password"
          placeholder="Password"
          fullWidth
          maxLength={PASSWORD_MAX_LENGTH}
          error={errors.password?.message}
          resetError={() => resetErrors("password")}
          {...register("password")}
        />

        <Spacing height={20} />

        <Checkbox
          id="save_email"
          checked={saveEmail}
          onChange={handleSaveEmailChange}
          label="Remember me"
        />

        {errors.root && (
          <Typography
            color="error-primary"
            size="sm"
            className={styles.errorMessage}
          >
            {errors.root.message}
          </Typography>
        )}
        <Spacing height={20} />
      </AccountForm>

      <Spacing height={16} />

      <Link href="/users/forgot_password" className={styles.forgotButton}>
        <Typography size="sm" weight="medium" color="quaternary">
          Forgot password?
        </Typography>
      </Link>
    </Card>
  );
};
