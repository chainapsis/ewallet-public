import { useState, type FC } from "react";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { ChevronDownIcon } from "@oko-wallet/oko-common-ui/icons/chevron_down";
import cn from "classnames";

import styles from "./collapsible.module.scss";

export interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export const Collapsible: FC<CollapsibleProps> = ({
  title,
  children,
  defaultExpanded = false,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  function toggleExpanded() {
    setIsExpanded((prev) => !prev);
  }

  return (
    <div className={cn(styles.collapsibleContainer, className)}>
      <div className={styles.collapsibleHeader} onClick={toggleExpanded}>
        <Typography color="secondary" size="sm" weight="semibold">
          {title}
        </Typography>
        <ChevronDownIcon
          className={cn(styles.chevronIcon, {
            [styles.expanded]: isExpanded,
          })}
        />
      </div>
      {isExpanded && (
        <div className={styles.collapsibleContent} data-collapsible-content>
          {children}
        </div>
      )}
    </div>
  );
};
