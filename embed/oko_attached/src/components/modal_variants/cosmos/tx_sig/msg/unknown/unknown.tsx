import { useEffect, useRef, useState, type FC } from "react";
import type { Msg } from "@keplr-wallet/types";
import { Typography } from "@oko-wallet-common-ui/typography/typography";
import { ChevronDownIcon } from "@oko-wallet-common-ui/icons/chevron_down";
import { ChevronUpIcon } from "@oko-wallet-common-ui/icons/chevron_up";
import cn from "classnames";

import type { UnpackedMsgForView } from "@oko-wallet-attached/types/cosmos_msg";
import styles from "./unknown.module.scss";

export const UnknownMessage: FC<UnknownMessageProps> = ({ msg }) => {
  const [isCollapse, setIsCollapse] = useState(true);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [showBottomFade, setShowBottomFade] = useState(true);
  const { type, content: defaultMsg } = extractDefaultMessage(msg);

  useEffect(() => {
    const rootEl = contentRef.current;
    const sentinelEl = sentinelRef.current;
    if (!rootEl || !sentinelEl) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setShowBottomFade(!entry.isIntersecting);
      },
      {
        root: rootEl,
        threshold: 1.0,
      },
    );
    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, []);

  const handleCollapse = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.stopPropagation();
    const willCollapse = !isCollapse;
    if (willCollapse) {
      contentRef.current?.scrollTo({ top: 0 });
    }
    setIsCollapse(!isCollapse);
  };

  const containerClassName = cn(styles.container, {
    [styles.isClickable]: isCollapse,
  });
  const contentClassName = cn(styles.contentContainer, {
    [styles.collapse]: isCollapse,
    [styles.opened]: !isCollapse,
    "common-list-scroll": true,
  });

  return (
    <div
      role="button"
      tabIndex={0}
      className={containerClassName}
      onClick={isCollapse ? handleCollapse : undefined}
    >
      <div
        className={styles.titleRow}
        onClick={handleCollapse}
        role="button"
        tabIndex={0}
      >
        <Typography color="brand-primary" size="xs" weight="medium">
          {type}
        </Typography>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsCollapse(!isCollapse)}
          className={styles.collapseButton}
        >
          {isCollapse ? (
            <ChevronDownIcon color="var(--fg-tertiary)" />
          ) : (
            <ChevronUpIcon color="var(--fg-tertiary)" />
          )}
        </div>
      </div>
      <div className={styles.contentWrapper}>
        <div
          className={cn(styles.coverTop, styles.animate, {
            [styles.visible]: !showBottomFade,
          })}
        />
        <div ref={contentRef} className={contentClassName}>
          <pre>{defaultMsg}</pre>
          <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
        </div>
        <div
          className={cn(styles.coverBottom, styles.animate, {
            [styles.visible]: showBottomFade,
          })}
        />
      </div>
    </div>
  );
};

function extractDefaultMessage(msg: Msg | UnpackedMsgForView): {
  type: string;
  content: string;
} {
  let prettyMsg: string;
  const type = parseTypeFromMsg(msg);

  try {
    if ("type" in msg) {
      prettyMsg = JSON.stringify(msg, null, 2);
    } else if ("typeUrl" in msg) {
      const { typeUrl, value, unpacked } = msg;
      prettyMsg = JSON.stringify(
        {
          typeUrl,
          value: unpacked ? { ...unpacked } : value,
        },
        null,
        2,
      );
    } else {
      prettyMsg = JSON.stringify(msg, null, 2);
    }
  } catch (e) {
    console.log("extractDefaultMessage error: ", String(e));
    prettyMsg = "Failed to decode the msg";
  }

  return {
    type,
    content: prettyMsg,
  };
}

function parseTypeFromMsg(msg: Msg | UnpackedMsgForView): string {
  try {
    if ("type" in msg) {
      const type = msg.type.split("/").reverse()[0];
      if (type.slice(0, 3) === "Msg") {
        return type.slice(3);
      }
      return type;
    }
    if ("typeUrl" in msg) {
      const type = msg.typeUrl.split(".").reverse()[0];
      if (type.slice(0, 3) === "Msg") {
        return type.slice(3);
      }
      return type;
    }
  } catch (e) {
    console.log("parseTypeFromMsg error: ", String(e));
    return "";
  }
  return "Unknown";
}

export interface UnknownMessageProps {
  chainId: string;
  msg: Msg | UnpackedMsgForView;
  key?: string | number;
}
