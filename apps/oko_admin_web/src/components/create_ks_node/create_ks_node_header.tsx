"use client";

import { useRouter } from "next/navigation";
import type { FC } from "react";

import styles from "./create_ks_node_header.module.scss";

// TODO: move to common ui
const BackArrowIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke="black"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface CreateKSNodeHeaderProps {
  mode?: CreateOrEditKSNodeProps["mode"];
}

export const CreateKSNodeHeader: FC<CreateKSNodeHeaderProps> = ({
  mode = "create",
}) => {
  const router = useRouter();

  const title = mode === "edit" ? "Edit Node" : "Add New Node";

  return (
    <div className={styles.wrapper}>
      <div className={styles.backButton} onClick={router.back}>
        <BackArrowIcon />
      </div>
      <p className={styles.title}>{title}</p>
    </div>
  );
};
