import type { CSSProperties, FC } from "react";

interface EmailHeaderProps {
  imageSrc: string;
  altText: string;
}

const wrapperStyle: CSSProperties = { position: "relative", width: "100%" };
const imageStyle: CSSProperties = {
  display: "block",
  width: "584px",
  maxWidth: "100%",
  borderRadius: "20px",
};

export const EmailHeader: FC<EmailHeaderProps> = ({ imageSrc, altText }) => {
  return (
    <div style={wrapperStyle}>
      <img src={imageSrc} width="584" alt={altText} style={imageStyle} />
    </div>
  );
};
