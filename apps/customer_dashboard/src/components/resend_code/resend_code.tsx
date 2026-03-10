import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { memo, useState } from "react";

import styles from "./resend_code.module.scss";
import { requestSendVerificationCode } from "@oko-wallet-ct-dashboard/fetch/users";
import { useAppState } from "@oko-wallet-ct-dashboard/state";

type ResendCodeProps = {
  disabled: boolean;
  onResendCode: () => void;
  setError: (message: string) => void;
};

export const ResendCode = memo<ResendCodeProps>(
  ({ disabled, onResendCode, setError }) => {
    const user = useAppState((state) => state.user);
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
      if (disabled) {
        return;
      }

      setIsLoading(true);
      setError("");

      const response = await requestSendVerificationCode(user?.email ?? "");

      if (response.success) {
        onResendCode();
      } else {
        setError(response.msg);
      }

      setIsLoading(false);
    };

    return (
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={handleClick}
        className={styles.resendLink}
      >
        <Typography
          tagType="span"
          size="sm"
          weight="semibold"
          color={disabled || isLoading ? "disabled" : "primary"}
          style={{
            textDecoration: "underline",
          }}
        >
          Resend
        </Typography>
      </button>
    );
  },
);
