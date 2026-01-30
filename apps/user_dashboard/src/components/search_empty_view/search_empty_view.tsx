import { ImageWithAlt } from "@oko-wallet/oko-common-ui/image_with_alt";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./search_empty_view.module.scss";
import { S3_BUCKET_URL } from "@oko-wallet-user-dashboard/fetch";

const emptyImage = `${S3_BUCKET_URL}/assets/oko_user_dashboard_search_empty.webp`;
const emptyImageAlt = `${S3_BUCKET_URL}/assets/oko_user_dashboard_search_empty.png`;

interface SearchEmptyViewProps {
  title?: string;
  description?: string;
}

export const SearchEmptyView: FC<SearchEmptyViewProps> = ({
  title = "No Match",
  description = "Check the spelling, or try another chain",
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.imageWrapper}>
        <ImageWithAlt
          srcSet={emptyImage}
          srcAlt={emptyImageAlt}
          alt="No search results"
          className={styles.image}
        />
      </div>
      <Typography size="sm" weight="semibold" color="secondary">
        {title}
      </Typography>
      <Typography size="sm" weight="medium" color="tertiary">
        {description}
      </Typography>
    </div>
  );
};
