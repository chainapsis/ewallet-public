"use client";

import { EyeIcon } from "@oko-wallet/oko-common-ui/icons/eye";
import { EyeOffIcon } from "@oko-wallet/oko-common-ui/icons/eye_off";
import { Input } from "@oko-wallet/oko-common-ui/input";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { type FC, useState } from "react";

import styles from "./reset_password.module.scss";
import { useResetPasswordForm } from "./use_reset_password_form";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@oko-wallet-ct-dashboard/constants";
import { AccountForm } from "@oko-wallet-ct-dashboard/ui";

interface ResetPasswordProps {
  isAfterLogin: boolean;
}

export const ResetPassword: FC<ResetPasswordProps> = ({ isAfterLogin }) => {
  const { onSubmit, register, errors, isLoading, isValid } =
    useResetPasswordForm(isAfterLogin);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className={styles.formContainer}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div>Updating password...</div>
        </div>
      )}

      <AccountForm
        onSubmit={onSubmit}
        disabled={!isValid || isLoading}
        submitText={isLoading ? "Updating..." : "Update"}
      >
        {isAfterLogin && (
          <>
            <Input
              {...register("originalPassword")}
              label="Enter current password"
              placeholder="Enter current password"
              requiredSymbol
              type="password"
              error={errors.originalPassword?.message}
              fullWidth
            />

            <Spacing height={28} />
          </>
        )}

        <Input
          {...register("newPassword")}
          label="Enter new password"
          placeholder="Enter new password"
          requiredSymbol
          type={showNewPassword ? "text" : "password"}
          helpText={
            errors.newPassword
              ? ""
              : `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters and must include numbers.`
          }
          error={errors.newPassword?.message}
          fullWidth
          SideComponent={
            <button
              type="button"
              className={styles.eyeButton}
              onClick={toggleNewPasswordVisibility}
            >
              {showNewPassword ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          }
        />

        <Spacing height={28} />

        <Input
          {...register("confirmPassword")}
          label="Confirm new password"
          placeholder="Confirm password"
          requiredSymbol
          type={showConfirmPassword ? "text" : "password"}
          error={errors.confirmPassword?.message}
          fullWidth
          SideComponent={
            <button
              type="button"
              className={styles.eyeButton}
              onClick={toggleConfirmPasswordVisibility}
            >
              {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          }
        />

        <Spacing height={40} />

        {errors.root && (
          <>
            <Typography color="error-primary" size="sm">
              {errors.root.message}
            </Typography>
            <Spacing height={16} />
          </>
        )}
      </AccountForm>
    </div>
  );
};
