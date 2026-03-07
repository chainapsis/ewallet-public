"use client";

import { useState, type FC } from "react";
import { ChevronDownIcon } from "@oko-wallet/oko-common-ui/icons/chevron_down";
import { ChevronUpIcon } from "@oko-wallet/oko-common-ui/icons/chevron_up";
import { InfoCircleIcon } from "@oko-wallet/oko-common-ui/icons/info_circle";

import styles from "./sign_info_box.module.scss";

export const SignInfoBox: FC<SignInfoBoxProps> = ({ title, items }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={styles.container}
      onClick={() => setIsExpanded((prev) => !prev)}
    >
      <div className={styles.header}>
        <InfoCircleIcon
          className={styles.headerIcon}
          color="var(--text-tertiary)"
          size={16}
        />
        <span className={styles.headerText}>{title}</span>
        {isExpanded ? (
          <ChevronUpIcon
            className={styles.chevronIcon}
            color="var(--text-tertiary)"
            size={20}
          />
        ) : (
          <ChevronDownIcon
            className={styles.chevronIcon}
            color="var(--text-tertiary)"
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
