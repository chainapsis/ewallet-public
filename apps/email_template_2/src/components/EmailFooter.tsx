import type { CSSProperties, FC } from "react";

const outerTableStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
};
const innerTableStyle: CSSProperties = { width: "360px", borderSpacing: "0" };
const iconCellStyle: CSSProperties = { width: "16px", paddingRight: "12px" };
const iconStyle: CSSProperties = {
  display: "block",
  width: "16px",
  height: "16px",
};
const spacer8Style: CSSProperties = {
  height: "8px",
  lineHeight: "8px",
  fontSize: "0",
};
const spacer32Style: CSSProperties = {
  height: "32px",
  lineHeight: "32px",
  fontSize: "0",
};
const linkStyle: CSSProperties = {
  fontFamily: "Inter, Arial, sans-serif",
  fontWeight: 500,
  fontSize: "16px",
  lineHeight: "160%",
  letterSpacing: "-0.01em",
  color: "#1c1b1f",
  textDecoration: "underline",
};
const thanksTextStyle: CSSProperties = {
  margin: 0,
  fontFamily: "Inter, Arial, sans-serif",
  fontWeight: 500,
  fontSize: "16px",
  lineHeight: "160%",
  letterSpacing: "-0.01em",
  color: "#1c1b1f",
};
const logoStyle: CSSProperties = {
  display: "block",
  width: "64px",
  height: "25px",
};

export const EmailFooter: FC = () => {
  return (
    <table
      role="presentation"
      width="360"
      align="center"
      cellPadding="0"
      cellSpacing="0"
      style={outerTableStyle}
    >
      <tbody>
        <tr>
          <td>
            <table
              role="presentation"
              width="360"
              cellPadding="0"
              cellSpacing="0"
              style={innerTableStyle}
            >
              <tbody>
                {/* Demo Link */}
                <tr>
                  <td width="16" style={iconCellStyle}>
                    <img
                      src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/icon-demo.png"
                      width="16"
                      height="16"
                      alt=""
                      style={iconStyle}
                    />
                  </td>
                  <td>
                    <a href="https://demo.oko.app/" style={linkStyle}>
                      Demo
                    </a>
                  </td>
                </tr>
                <tr>
                  <td height="8" colSpan={2} style={spacer8Style}>
                    &nbsp;
                  </td>
                </tr>

                {/* Docs Link */}
                <tr>
                  <td width="16" style={iconCellStyle}>
                    <img
                      src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/icon-docs.png"
                      width="16"
                      height="16"
                      alt=""
                      style={iconStyle}
                    />
                  </td>
                  <td>
                    <a href="https://docs.oko.app/docs" style={linkStyle}>
                      Docs
                    </a>
                  </td>
                </tr>
                <tr>
                  <td height="8" colSpan={2} style={spacer8Style}>
                    &nbsp;
                  </td>
                </tr>

                {/* Inquiries Link */}
                <tr>
                  <td width="16" style={iconCellStyle}>
                    <img
                      src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/icon-inquiries.png"
                      width="16"
                      height="16"
                      alt=""
                      style={iconStyle}
                    />
                  </td>
                  <td>
                    <a
                      href="https://okowallet.userjot.com/board/integration-support-inquiries"
                      style={linkStyle}
                    >
                      Integration Inquiries
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td height="32" style={spacer32Style}>
            &nbsp;
          </td>
        </tr>
        <tr>
          <td>
            <p style={thanksTextStyle}>Thanks!</p>
          </td>
        </tr>
        <tr>
          <td height="32" style={spacer32Style}>
            &nbsp;
          </td>
        </tr>
        <tr>
          <td align="center">
            <img
              src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/logo-footer.png"
              width="64"
              height="25"
              alt="Oko Logo"
              style={logoStyle}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
};
