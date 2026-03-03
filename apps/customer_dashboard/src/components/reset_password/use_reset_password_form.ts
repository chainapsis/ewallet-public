import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

import {
  PASSWORD_CONTAINS_NUMBER_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@oko-wallet-ct-dashboard/constants";
import { requestChangePassword } from "@oko-wallet-ct-dashboard/fetch/users";
import { paths } from "@oko-wallet-ct-dashboard/paths";
import { useAppState } from "@oko-wallet-ct-dashboard/state";

export type ResetPasswordInputs = {
  originalPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function useResetPasswordForm(isAfterLogin: boolean) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isValid },
  } = useForm<ResetPasswordInputs>({
    resolver: isAfterLogin
      ? resetPasswordResolver
      : resetPasswordResolverWithoutOriginal,
    mode: "onTouched",
  });

  const router = useRouter();

  const user = useAppState((state) => state.user);
  const token = useAppState((state) => state.token);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<ResetPasswordInputs> = async (data) => {
    setIsLoading(true);

    try {
      const result = await requestChangePassword(
        user?.email ?? "",
        isAfterLogin ? data.originalPassword : undefined,
        data.newPassword,
        token ?? "",
      );

      if (result.success) {
        reset();
        alert("Password changed successfully"); // TODO: toast로 변경
        router.push(paths.home);
      } else {
        if (result.code === "ORIGINAL_PASSWORD_INCORRECT") {
          setError("originalPassword", {
            message: "Current password is incorrect",
          });
        } else {
          setError("root", {
            message: result.msg || "Failed to verify account",
          });
        }
      }
    } catch (error: any) {
      console.error("error", error);
      setError("root", { message: "Failed to change password" });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    onSubmit: handleSubmit(onSubmit),
    register,
    errors,
    isLoading,
    isValid,
  };
}

function validateNewPassword(values: ResetPasswordInputs) {
  const errors: Record<string, any> = {};

  if (!values.newPassword) {
    errors.newPassword = { type: "required", message: "Password is required" };
  } else if (values.newPassword.length < PASSWORD_MIN_LENGTH) {
    errors.newPassword = {
      type: "minLength",
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    };
  } else if (values.newPassword.length > PASSWORD_MAX_LENGTH) {
    errors.newPassword = {
      type: "maxLength",
      message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
    };
  } else if (!PASSWORD_CONTAINS_NUMBER_REGEX.test(values.newPassword)) {
    errors.newPassword = {
      type: "pattern",
      message: "Password must include at least one number",
    };
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = {
      type: "required",
      message: "Please confirm your password",
    };
  } else if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = {
      type: "validate",
      message: "Passwords do not match",
    };
  }

  return errors;
}

function resetPasswordResolver(values: ResetPasswordInputs) {
  const errors = validateNewPassword(values);

  if (!values.originalPassword) {
    errors.originalPassword = {
      type: "required",
      message: "Password is required",
    };
  }

  return {
    values: values,
    errors: errors,
  } as any;
}

function resetPasswordResolverWithoutOriginal(values: ResetPasswordInputs) {
  const errors = validateNewPassword(values);

  return {
    values: values,
    errors: errors,
  } as any;
}
