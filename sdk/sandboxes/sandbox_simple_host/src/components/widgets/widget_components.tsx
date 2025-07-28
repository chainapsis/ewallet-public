import React, { type PropsWithChildren } from "react";

import styles from "./widget_components.module.scss";

export const Widget: React.FC<PropsWithChildren> = ({ children }) => {
  return <div className={styles.widget}>{children}</div>;
};
