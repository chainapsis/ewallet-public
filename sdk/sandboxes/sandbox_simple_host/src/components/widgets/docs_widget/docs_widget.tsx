import React from "react";
import { Button } from "@keplr-ewallet/ewallet-common-ui/button";
import { ArrowRightOutlinedIcon } from "@keplr-ewallet/ewallet-common-ui/icons/arrow_right_outlined";
import { Typography } from "@keplr-ewallet/ewallet-common-ui/typography";

import { Widget } from "../widget_components";
import styles from "./docs_widget.module.scss";

export const DocsWidget: React.FC = () => {
  const handleOpenDocs = () => {
    console.log("Open docs clicked");
  };

  return (
    <Widget>
      <div className={styles.container}>
        <Typography
          tagType="h3"
          size="sm"
          weight="regular"
          color="secondary"
          className={styles.title}
        >
          Build with Keplr Embedded
        </Typography>
        <Typography
          size="md"
          weight="medium"
          color="tertiary"
          className={styles.content}
        >
          Explore the SDK, APIs, and integration guides to start building.
        </Typography>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={handleOpenDocs}
        >
          Open Docs
          <ArrowRightOutlinedIcon
            color="#A4A7AE"
            className={styles.arrowIcon}
          />
        </Button>
      </div>
    </Widget>
  );
};
