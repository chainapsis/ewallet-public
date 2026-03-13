import type { CSSProperties, FC, ReactNode } from "react";

interface EmailCodeProps {
  code: string;
  title?: ReactNode;
}

const outerTableStyle: CSSProperties = {
  width: "296px",
  maxWidth: "100%",
  margin: "0 auto",
  borderSpacing: "0",
};
const titleCellStyle: CSSProperties = { verticalAlign: "top" };
const titleTextStyle: CSSProperties = {
  margin: 0,
  fontFamily: "Inter, Arial, sans-serif",
  fontWeight: 500,
  fontSize: "16px",
  lineHeight: "160%",
  letterSpacing: "-0.01em",
  color: "#1c1b1f",
  textAlign: "center",
};
const spacer16Style: CSSProperties = {
  height: "16px",
  lineHeight: "16px",
  fontSize: "0",
};
const codeCellStyle: CSSProperties = {};
const codeTextStyle: CSSProperties = {
  margin: 0,
  fontFamily: "Inter, Arial, sans-serif",
  fontWeight: 600,
  fontSize: "40px",
  lineHeight: "100%",
  letterSpacing: "-0.03em",
  color: "#1c1b1f",
  textAlign: "center",
};
const spacer24Style: CSSProperties = {
  height: "24px",
  lineHeight: "24px",
  fontSize: "0",
};
const keyCellStyle: CSSProperties = { height: "24px" };
const keyIconStyle: CSSProperties = {
  display: "block",
  width: "24px",
  height: "24px",
};

export const EmailCode: FC<EmailCodeProps> = ({ code, title }) => {
  const displayTitle = title ?? "Your 6-digit code";

  return (
    <table
      role="presentation"
      width="296"
      align="center"
      cellPadding="0"
      cellSpacing="0"
      style={outerTableStyle}
    >
      <tbody>
        <tr>
          <td style={titleCellStyle}>
            <p style={titleTextStyle}>{displayTitle}</p>
          </td>
        </tr>
        <tr>
          <td height="16" style={spacer16Style}>
            &nbsp;
          </td>
        </tr>
        <tr>
          <td style={codeCellStyle}>
            <p style={codeTextStyle}>{code}</p>
          </td>
        </tr>
        <tr>
          <td height="24" style={spacer24Style}>
            &nbsp;
          </td>
        </tr>
        <tr>
          <td align="center" style={keyCellStyle}>
            <img
              src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/code-key-icon.png"
              width="24"
              height="24"
              alt=""
              style={keyIconStyle}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
};
