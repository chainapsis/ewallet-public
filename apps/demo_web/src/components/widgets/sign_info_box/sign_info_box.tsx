"use client";

import { ChevronDownIcon } from "@oko-wallet/oko-common-ui/icons/chevron_down";
import { ChevronUpIcon } from "@oko-wallet/oko-common-ui/icons/chevron_up";
import { InfoCircleIcon } from "@oko-wallet/oko-common-ui/icons/info_circle";
import cn from "classnames";
import { type FC, useState } from "react";

import styles from "./sign_info_box.module.scss";

export const SignInfoBox: FC<SignInfoBoxProps> = ({ title, items }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(styles.container, { [styles.expanded]: isExpanded })}
      onClick={() => setIsExpanded((prev) => !prev)}
    >
      <div className={styles.header}>
        <div className={styles.headerTextContainer}>
          <InfoCircleIcon
            className={styles.headerIcon}
            color="currentColor"
            size={16}
          />
          <span className={styles.headerText}>{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon
            className={styles.chevronIcon}
            color="currentColor"
            size={20}
          />
        ) : (
          <ChevronDownIcon
            className={styles.chevronIcon}
            color="currentColor"
            size={20}
          />
        )}
      </div>
      {isExpanded && (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item} className={styles.listItem}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export interface SignInfoBoxProps {
  title: string;
  items: string[];
}
