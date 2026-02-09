import { type CSSProperties } from "react";

import { EmailLayout } from "@oko-wallet-email-template-2/components/EmailLayout";
import { EmailHeader } from "@oko-wallet-email-template-2/components/EmailHeader";
import { EmailCard } from "@oko-wallet-email-template-2/components/EmailCard";
import { EmailText } from "@oko-wallet-email-template-2/components/EmailText";
import { EmailButton } from "@oko-wallet-email-template-2/components/EmailButton";

const containerStyle: CSSProperties = { padding: "2px" };
const bodyWrapperStyle: CSSProperties = {
  paddingBottom: "32px",
  width: "100%",
};
const fullWidthTableStyle: CSSProperties = { borderSpacing: "0" };
const outerTdStyle: CSSProperties = { paddingTop: "32px" };
const cardContainerStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
};
const contentTdStyle: CSSProperties = { height: "793px" };
const contentTableStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
  height: "793px",
};
const spacer33Style: CSSProperties = {
  height: "33.72px",
  lineHeight: "33.72px",
  fontSize: "0",
};
const spacer32Style: CSSProperties = {
  height: "32px",
  lineHeight: "32px",
  fontSize: "0",
};
const innerCardTableStyle: CSSProperties = {
  width: "296px",
  maxWidth: "100%",
  margin: "0 auto",
  borderSpacing: "0",
};
const cell26Style: CSSProperties = { height: "26px" };
const spacer8Style: CSSProperties = {
  height: "8px",
  lineHeight: "8px",
  fontSize: "0",
};
const cell30Style: CSSProperties = { height: "30px" };
const spacer24Style: CSSProperties = {
  height: "24px",
  lineHeight: "24px",
  fontSize: "0",
};
const captionWrapperStyle: CSSProperties = {
  width: "296px",
  maxWidth: "100%",
  borderSpacing: "0",
};
const sectionTableStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
};
const spacer16Style: CSSProperties = {
  height: "16px",
  lineHeight: "16px",
  fontSize: "0",
};
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
const linkStyle: CSSProperties = {
  fontFamily: "Inter, Arial, sans-serif",
  fontWeight: 500,
  fontSize: "16px",
  lineHeight: "160%",
  letterSpacing: "-0.01em",
  color: "#1c1b1f",
  textDecoration: "underline",
};
const logoStyle: CSSProperties = {
  display: "block",
  width: "64px",
  height: "25px",
};
const footerTableStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
  height: "26px",
};

export default function RemindUnverifiedPage() {
  return (
    <EmailLayout>
      <div style={containerStyle}>
        <EmailHeader
          imageSrc="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/remind-login.png"
          altText="Oko reminder header"
        />
        <div style={bodyWrapperStyle}>
          <table
            role="presentation"
            width="100%"
            cellPadding="0"
            cellSpacing="0"
            style={fullWidthTableStyle}
          >
            <tbody>
              <tr>
                <td align="center" valign="top" style={outerTdStyle}>
                  <table
                    role="presentation"
                    width="360"
                    cellPadding="0"
                    cellSpacing="0"
                    style={cardContainerStyle}
                  >
                    <tbody>
                      <tr>
                        <td valign="top" style={contentTdStyle}>
                          <table
                            role="presentation"
                            width="360"
                            cellPadding="0"
                            cellSpacing="0"
                            style={contentTableStyle}
                          >
                            <tbody>
                              <tr>
                                <td>
                                  <EmailText>
                                    Hi {"${customerName}"},
                                    <br />
                                    <br />
                                    You're just one step away from unlocking
                                    your Oko dApp Dashboard.
                                    <br />
                                    <br />
                                    Once you verify your email, you'll get
                                    immediate access to your API key and get our
                                    integration support so you can start
                                    integrating Oko into your dApp.
                                  </EmailText>
                                </td>
                              </tr>
                              <tr>
                                <td height="33.72" style={spacer33Style}>
                                  &nbsp;
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <EmailText>
                                    To continue, verify your email to activate
                                    your dashboard with the temporary password
                                    below.
                                  </EmailText>
                                </td>
                              </tr>
                              <tr>
                                <td height="32" style={spacer32Style}>
                                  &nbsp;
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <EmailCard>
                                    <table
                                      role="presentation"
                                      width="296"
                                      align="center"
                                      cellPadding="0"
                                      cellSpacing="0"
                                      style={innerCardTableStyle}
                                    >
                                      <tbody>
                                        <tr>
                                          <td style={cell26Style}>
                                            <EmailText align="center">
                                              Your temporary password is
                                            </EmailText>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td height="8" style={spacer8Style}>
                                            &nbsp;
                                          </td>
                                        </tr>
                                        <tr>
                                          <td style={cell30Style}>
                                            <EmailText
                                              variant="heading"
                                              align="center"
                                            >
                                              {"${temporaryPassword}"}
                                            </EmailText>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <table
                                      role="presentation"
                                      width="100%"
                                      cellPadding="0"
                                      cellSpacing="0"
                                      style={fullWidthTableStyle}
                                    >
                                      <tbody>
                                        <tr>
                                          <td height="24" style={spacer24Style}>
                                            &nbsp;
                                          </td>
                                        </tr>
                                        <tr>
                                          <td align="center">
                                            <EmailButton href="https://dapp.oko.app">
                                              Sign In
                                            </EmailButton>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <table
                                      role="presentation"
                                      width="100%"
                                      cellPadding="0"
                                      cellSpacing="0"
                                      style={fullWidthTableStyle}
                                    >
                                      <tbody>
                                        <tr>
                                          <td height="24" style={spacer24Style}>
                                            &nbsp;
                                          </td>
                                        </tr>
                                        <tr>
                                          <td align="center">
                                            <table
                                              role="presentation"
                                              width="296"
                                              cellPadding="0"
                                              cellSpacing="0"
                                              style={captionWrapperStyle}
                                            >
                                              <tbody>
                                                <tr>
                                                  <td>
                                                    <EmailText
                                                      variant="caption"
                                                      align="center"
                                                    >
                                                      Please sign in and update
                                                      your password after your
                                                      first login.
                                                    </EmailText>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </EmailCard>
                                </td>
                              </tr>
                              <tr>
                                <td height="32" style={spacer32Style}>
                                  &nbsp;
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <table
                                    role="presentation"
                                    width="360"
                                    cellPadding="0"
                                    cellSpacing="0"
                                    style={sectionTableStyle}
                                  >
                                    <tbody>
                                      <tr>
                                        <td>
                                          <EmailText>
                                            Here are a few links that may help
                                            during integration:
                                          </EmailText>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td height="16" style={spacer16Style}>
                                          &nbsp;
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
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
                                                <td
                                                  width="16"
                                                  style={iconCellStyle}
                                                >
                                                  <img
                                                    src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/icon-demo.png"
                                                    width="16"
                                                    height="16"
                                                    alt=""
                                                    style={iconStyle}
                                                  />
                                                </td>
                                                <td>
                                                  <a
                                                    href="https://demo.oko.app/"
                                                    style={linkStyle}
                                                  >
                                                    Demo
                                                  </a>
                                                </td>
                                              </tr>
                                              <tr>
                                                <td
                                                  height="8"
                                                  colSpan={2}
                                                  style={spacer8Style}
                                                >
                                                  &nbsp;
                                                </td>
                                              </tr>

                                              {/* Docs Link */}
                                              <tr>
                                                <td
                                                  width="16"
                                                  style={iconCellStyle}
                                                >
                                                  <img
                                                    src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/icon-docs.png"
                                                    width="16"
                                                    height="16"
                                                    alt=""
                                                    style={iconStyle}
                                                  />
                                                </td>
                                                <td>
                                                  <a
                                                    href="https://docs.oko.app/docs"
                                                    style={linkStyle}
                                                  >
                                                    Docs
                                                  </a>
                                                </td>
                                              </tr>
                                              <tr>
                                                <td
                                                  height="8"
                                                  colSpan={2}
                                                  style={spacer8Style}
                                                >
                                                  &nbsp;
                                                </td>
                                              </tr>

                                              {/* Inquiries Link */}
                                              <tr>
                                                <td
                                                  width="16"
                                                  style={iconCellStyle}
                                                >
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
                                          <EmailText>
                                            If you need help at any step, simply
                                            reply and we will support you.
                                            <br />
                                            <br />
                                            Excited to see what you build with
                                            Oko!
                                          </EmailText>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td height="32" style={spacer32Style}>
                                          &nbsp;
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>
                                          <table
                                            role="presentation"
                                            width="360"
                                            cellPadding="0"
                                            cellSpacing="0"
                                            align="center"
                                            style={footerTableStyle}
                                          >
                                            <tbody>
                                              <tr>
                                                <td align="center">
                                                  <EmailText align="center">
                                                    Oko Team
                                                  </EmailText>
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
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </EmailLayout>
  );
}
