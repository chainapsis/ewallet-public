import cn from "classnames";
import React, { type FC } from "react";

import styles from "./typography.module.scss";

export type BaseTypographyColor =
  | "primary"
  | "secondary"
  | "tertiary"
  | "quaternary"
  | "primary-on-brand"
  | "secondary-on-brand"
  | "tertiary-on-brand"
  | "quaternary-on-brand"
  | "secondary-hover"
  | "tertiary-hover"
  | "white"
  | "disabled"
  | "placeholder"
  | "placeholder-subtle"
  | "subtle"
  | "brand-primary"
  | "brand-secondary"
  | "brand-secondary-hover"
  | "brand-tertiary"
  | "error-primary"
  | "error-primary-hover"
  | "warning-primary"
  | "success-primary";

export type BaseTypographyCustomColor =
  | "white"
  | "black"
  | "transparent"
  | "gray-50"
  | "gray-100"
  | "gray-200"
  | "gray-300"
  | "gray-400"
  | "gray-500"
  | "gray-600"
  | "gray-700"
  | "gray-800"
  | "gray-900"
  | "brand-50"
  | "brand-100"
  | "brand-200"
  | "brand-300"
  | "brand-400"
  | "brand-500"
  | "brand-600"
  | "brand-700"
  | "brand-800"
  | "brand-900"
  | "error-25"
  | "error-50"
  | "error-100"
  | "error-200"
  | "error-300"
  | "error-400"
  | "error-500"
  | "error-600"
  | "error-700"
  | "error-800"
  | "error-900"
  | "error-950"
  | "warning-25"
  | "warning-50"
  | "warning-100"
  | "warning-200"
  | "warning-300"
  | "warning-400"
  | "warning-500"
  | "warning-600"
  | "warning-700"
  | "warning-800"
  | "warning-900"
  | "warning-950"
  | "success-25"
  | "success-50"
  | "success-100"
  | "success-200"
  | "success-300"
  | "success-400"
  | "success-500"
  | "success-600"
  | "success-700"
  | "success-800"
  | "success-900"
  | "success-950";

export type BaseTypographyProps = {
  children: string | React.ReactNode;
  size?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "display-xs"
    | "display-sm"
    | "display-md"
    | "display-lg"
    | "display-xl"
    | "display-2xl";
  weight?: "regular" | "medium" | "semibold" | "bold";

  color?: BaseTypographyColor;

  customColor?: BaseTypographyCustomColor;

  className?: string;
  style?: React.CSSProperties;
};

type GeneralTypographyProps = BaseTypographyProps & {
  tagType?:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "p"
    | "span"
    | "div"
    | "label";
};

type ATagProps = BaseTypographyProps & {
  tagType: "a";
  href?: string;
  target?: string;
  rel?: string;
};

type TypographyProps = GeneralTypographyProps | ATagProps;

export const Typography: FC<TypographyProps> = ({
  children,
  tagType = "p",
  size = "md",
  weight = "regular",
  color,
  customColor,
  className,
  style,
  ...props
}) => {
  const classNames = cn(
    styles.typography,
    styles[`size-${size}`],
    styles[`weight-${weight}`],
    styles[`color-${color}`],
    styles[`custom-color-${customColor}`],
    styles[`font-line-height-${size}`],
    className,
  );

  if (tagType === "a") {
    const aTagProps = props as Omit<ATagProps, keyof BaseTypographyProps>;
    return (
      <a
        className={classNames}
        style={style}
        href={aTagProps.href}
        target={aTagProps.target}
        rel={aTagProps.rel}
      >
        {children}
      </a>
    );
  }

  return React.createElement(
    tagType,
    {
      className: classNames,
      style,
    },
    children,
  );
};
