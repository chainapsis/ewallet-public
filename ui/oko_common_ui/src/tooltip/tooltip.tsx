import {
  arrow,
  FloatingArrow,
  offset,
  type Placement,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import cn from "classnames";
import { type FC, useRef, useState } from "react";

import styles from "./tooltip.module.scss";
import {
  type BaseTypographyColor,
  type BaseTypographyCustomColor,
  Typography,
} from "@oko-wallet-common-ui/typography/typography";

export type TooltipProps = {
  children: React.ReactNode;
  title?: string;
  content?: string;
  className?: string;
  placement?: Placement;
  hideFloatingArrow?: boolean;
  backgroundColor?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "quaternary"
    | "primary-solid"
    | "secondary-solid"
    | "tertiary-solid"
    | "quaternary-solid"
    | "brand-solid";
  titleColor?: BaseTypographyColor;
  titleCustomColor?: BaseTypographyCustomColor;
};

export const Tooltip: FC<TooltipProps> = ({
  children,
  className,
  placement,
  title,
  content,
  hideFloatingArrow,
  backgroundColor: bgColor,
  titleColor,
  titleCustomColor,
}) => {
  const backgroundColor = bgColor ?? "primary-solid";
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    placement,
    onOpenChange: setIsOpen,
    middleware: [
      offset(hideFloatingArrow ? 4 : 10),
      arrow({
        element: arrowRef,
        padding: {
          top: 8,
          right: 8,
          bottom: 8,
          left: 8,
        },
      }),
    ],
  });

  const hover = useHover(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  const anchorClassNames = cn(className);
  const floatingClassNames = cn(
    styles.floatingUI,
    styles[`bg-${backgroundColor}`],
  );
  const arrowClassNames = cn(
    styles.arrow,
    styles[`arrow-color-${backgroundColor}`],
  );

  return (
    <>
      <div
        className={anchorClassNames}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {children}
      </div>
      {isOpen && (
        <div
          className={floatingClassNames}
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
        >
          {title && (
            <Typography
              size="xs"
              weight="semibold"
              color={titleColor ?? "white"}
              customColor={titleCustomColor}
            >
              {title}
            </Typography>
          )}
          {content && (
            <Typography
              size="xs"
              weight="medium"
              color="secondary"
              style={{ color: "#D5D7DA" }}
            >
              {content}
            </Typography>
          )}
          {!hideFloatingArrow && (
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className={arrowClassNames}
            />
          )}
        </div>
      )}
    </>
  );
};
