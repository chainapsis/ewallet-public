import type { FC } from "react";

import { Widget } from "../widget_components";
import styles from "./docs_widget.module.scss";

export const DocsWidget: FC = () => {
  const handleOpenDocs = () => {
    console.log("Open docs clicked");
  };

  return (
    <Widget>
      <div className={styles.container}>
        <p>Build with Oko</p>
        <p>Explore the SDK, APIs, and integration guides to start building.</p>
        <button type="button" onClick={handleOpenDocs}>
          Open Docs
        </button>
      </div>
    </Widget>
  );
};
