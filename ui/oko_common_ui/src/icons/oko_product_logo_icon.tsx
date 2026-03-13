import { s3BucketURL } from "./paths";
import type { Theme } from "@oko-wallet-common-ui/theme/theme_provider";

/**
 * @deprecated Use OkoLogoIcon instead
 */
export const OkoProductLogoIcon: FC<OkoProductLogoIconProps> = ({
  width = 323.702,
  height = 128,
  className,
  theme,
}) => {
  const _theme = theme ?? "dark";

  return (
    <img
      src={
        _theme === "light"
          ? `${s3BucketURL}/oko_product_logo_light.svg`
          : `${s3BucketURL}/oko_product_logo_dark.svg`
      }
      alt="oko_product_logo_icon"
      width={width}
      height={height}
      className={className}
    />
  );
};

export interface OkoProductLogoIconProps {
  width?: number;
  height?: number;
  className?: string;
  theme?: Theme | null;
}
