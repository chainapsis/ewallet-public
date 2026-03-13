import type { CSSProperties, FC } from "react";

interface EmailCardProps {
  children: React.ReactNode;
  height?: string | number;
  padding?: string;
}

const outerTableBase: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
};
const cardTdStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
};
const screwImgStyle: CSSProperties = {
  display: "block",
  border: 0,
  outline: "none",
  textDecoration: "none",
};
const topLeftPadding: CSSProperties = { padding: "10px 0 0 10px" };
const topRightPadding: CSSProperties = { padding: "10px 10px 0 0" };
const bottomLeftPadding: CSSProperties = { padding: "0 0 10px 10px" };
const bottomRightPadding: CSSProperties = { padding: "0 10px 10px 0" };
const innerTableStyle: CSSProperties = { borderSpacing: "0" };
const contentTdStyle: CSSProperties = { padding: "32px 32px 24px 32px" };

export const EmailCard: FC<EmailCardProps> = ({
  children,
  height,
  padding,
}) => {
  return (
    <table
      role="presentation"
      width="360"
      align="center"
      cellPadding="0"
      cellSpacing="0"
      style={{ ...outerTableBase, height }}
    >
      <tbody>
        <tr>
          <td style={cardTdStyle}>
            {/* Top Screws */}
            <table
              role="presentation"
              width="100%"
              cellPadding="0"
              cellSpacing="0"
              style={innerTableStyle}
            >
              <tbody>
                <tr>
                  <td align="left" style={topLeftPadding}>
                    <img
                      src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/screw-top-left.png"
                      width="16"
                      height="16"
                      alt=""
                      style={screwImgStyle}
                    />
                  </td>
                  <td align="right" style={topRightPadding}>
                    <img
                      src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/screw-top-right.png"
                      width="16"
                      height="16"
                      alt=""
                      style={screwImgStyle}
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Content */}
            <table
              role="presentation"
              width="100%"
              cellPadding="0"
              cellSpacing="0"
              style={innerTableStyle}
            >
              <tbody>
                <tr>
                  <td
                    align="center"
                    valign="top"
                    style={{
                      ...contentTdStyle,
                      ...(padding ? { padding } : {}),
                    }}
                  >
                    {children}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Bottom Screws */}
            <table
              role="presentation"
              width="100%"
              cellPadding="0"
              cellSpacing="0"
              style={innerTableStyle}
            >
              <tbody>
                <tr>
                  <td align="left" style={bottomLeftPadding}>
                    <img
                      src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/screw-bottom-left.png"
                      width="16"
                      height="16"
                      alt=""
                      style={screwImgStyle}
                    />
                  </td>
                  <td align="right" style={bottomRightPadding}>
                    <img
                      src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/screw-bottom-right.png"
                      width="16"
                      height="16"
                      alt=""
                      style={screwImgStyle}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
};
