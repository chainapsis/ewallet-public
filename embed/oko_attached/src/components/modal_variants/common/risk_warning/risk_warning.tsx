import { Checkbox } from "@oko-wallet/oko-common-ui/checkbox";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./risk_warning.module.scss";

interface RiskWarningCheckBoxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const RiskWarningCheckBox: FC<RiskWarningCheckBoxProps> = ({
  checked,
  onChange,
}) => {
  return (
    <div className={styles.riskWarningContainer}>
      <Checkbox
        id="sign-in-message-checkbox"
        checked={checked}
        onChange={onChange}
        label="I understand the risk and would like to proceed."
        labelStyle={{
          color: "secondary",
          size: "xs",
          weight: "medium",
        }}
        checkboxContainerClassName={styles.riskWarningCheckBoxContainer}
        checkBoxInputContainerClassName={
          styles.riskWarningCheckBoxInputContainerClassName
        }
      />
    </div>
  );
};

export const RiskWarningBox: FC = () => {
  return (
    <div className={styles.riskWarningBox}>
      <Typography size="xs" color="warning-primary" weight="medium">
        The URL requesting your signature differs from the current website. This
        may indicate a potential security risk.
      </Typography>
    </div>
  );
};
