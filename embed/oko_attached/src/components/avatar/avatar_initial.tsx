import {
  type BaseTypographyProps,
  Typography,
} from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./avatar.module.scss";

export interface AvatarInitialProps {
  initial: string;
  sizePx: number;
  textSize: BaseTypographyProps["size"];
  borderRadius: string;
  variant: "block" | "overlay";
  visible?: boolean;
}

export const AvatarInitial: FC<AvatarInitialProps> = ({
  initial,
  sizePx,
  textSize,
  borderRadius,
  variant,
  visible = true,
}) => {
  if (variant === "overlay") {
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          borderRadius,
          backgroundColor: "var(--bg-secondary-solid)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          opacity: visible ? 1 : 0,
          pointerEvents: "none",
        }}
      >
        <Typography color="white" size={textSize} weight="medium">
          {initial}
        </Typography>
      </div>
    );
  }

  return (
    <div
      className={styles.wrapper}
      style={{
        width: sizePx,
        height: sizePx,
        borderRadius,
        backgroundColor: "var(--bg-secondary-solid)",
      }}
    >
      <Typography color="white" size={textSize} weight="medium">
        {initial}
      </Typography>
    </div>
  );
};
