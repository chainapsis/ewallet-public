import cn from "classnames";
import type { FC } from "react";

import styles from "./card.module.scss";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outlined" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: FC<React.PropsWithChildren<CardProps>> = ({
  variant = "default",
  padding = "md",
  header,
  footer,
  children,
  className,
  ...rest
}) => {
  const cardClassName = cn(
    styles.card,
    styles[variant],
    styles[`padding-${padding}`],
    className,
  );

  return (
    <div className={cardClassName} {...rest}>
      {header && <div className={styles.header}>{header}</div>}
      <div className={styles.content}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
};
