import { s3BucketURL } from "./paths";

export const KeplrIcon: FC<KeplrIconProps> = ({ width = 20, height = 20 }) => {
  return (
    <img
      src={`${s3BucketURL}/keplr.png`}
      alt="keplr_icon"
      width={width}
      height={height}
    />
  );
};

export interface KeplrIconProps {
  width?: number;
  height?: number;
}
