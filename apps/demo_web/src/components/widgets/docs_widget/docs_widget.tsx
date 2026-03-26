import { Button } from "@oko-wallet/oko-common-ui/button";
import { ArrowRightOutlinedIcon } from "@oko-wallet/oko-common-ui/icons/arrow_right_outlined";
import { BookOpenIcon } from "@oko-wallet/oko-common-ui/icons/book_open";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { useOko } from "@oko-wallet/oko-sdk-react";
import type { FC } from "react";

import { Widget } from "../widget_components";
import styles from "./docs_widget.module.scss";

export const DocsWidget: FC = () => {
  const { isSignedIn } = useOko();

  const handleOpenDocs = () => {
    window.open(process.env.NEXT_PUBLIC_OKO_DOCS_ENDPOINT, "_blank");
  };

  return (
    <Widget>
      <div className={styles.container}>
        <div className={styles.title}>
          <BookOpenIcon size={16} color="#ED6B25" />
          <Typography tagType="h3" size="md" weight="semibold" color="primary">
            Build with Oko
          </Typography>
        </div>

        <Typography
          size="sm"
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
            color={isSignedIn ? "var(--fg-quaternary)" : "var(--brand-300)"}
            className={styles.arrowIcon}
          />
        </Button>
      </div>
    </Widget>
  );
};
