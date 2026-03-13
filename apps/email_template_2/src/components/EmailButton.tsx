import type { CSSProperties, FC } from "react";

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

const buttonTableStyle: CSSProperties = {
  borderSpacing: "0",
  margin: "0 auto",
};
const buttonTdStyle: CSSProperties = {
  backgroundColor: "#1c1b1f",
  borderRadius: "222px",
  height: "45px",
};
const linkStyle: CSSProperties = {
  display: "inline-block",
  padding: "12px 32px",
  fontFamily: "Inter, Arial, sans-serif",
  fontWeight: 500,
  fontSize: "14px",
  lineHeight: "150%",
  letterSpacing: "-0.01em",
  color: "#fffffe",
  textDecoration: "none",
  textAlign: "center",
};

export const EmailButton: FC<EmailButtonProps> = ({ href, children }) => {
  return (
    <table
      role="presentation"
      cellPadding="0"
      cellSpacing="0"
      style={buttonTableStyle}
    >
      <tbody>
        <tr>
          <td align="center" style={buttonTdStyle}>
            <a href={href} style={linkStyle}>
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
};
