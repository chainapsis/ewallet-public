import {
  type BaseTypographyProps,
  Typography,
} from "@oko-wallet/oko-common-ui/typography";
import cn from "classnames";
import type { CSSProperties, FC } from "react";

import styles from "./tx_row.module.scss";

export interface TxRowProps {
  label?: string;
  labelSize?: BaseTypographyProps["size"];
  children: React.ReactNode;
  className?: string;
}

export const TxRow: FC<TxRowProps> = ({
  label,
  labelSize,
  children,
  className,
}) => {
  const txRowStyle = labelSize
    ? ({
        "--tx-row-mobile-label-font-size": `var(--font-size-${labelSize})`,
        "--tx-row-mobile-label-line-height": `var(--font-line-height-${labelSize})`,
      } as CSSProperties)
    : undefined;

  return (
    <div className={cn(styles.txRow, className)} style={txRowStyle}>
      {label ? (
        <Typography color="tertiary" size={labelSize ?? "xs"} weight="medium">
          {label}
        </Typography>
      ) : null}
      {children}
    </div>
  );
};
