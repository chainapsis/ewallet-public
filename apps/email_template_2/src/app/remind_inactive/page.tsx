import { type CSSProperties } from "react";

import { EmailLayout } from "@oko-wallet-email-template-2/components/EmailLayout";
import { EmailHeader } from "@oko-wallet-email-template-2/components/EmailHeader";
import { EmailText } from "@oko-wallet-email-template-2/components/EmailText";

const containerStyle: CSSProperties = { padding: "2px" };
const bodyWrapperStyle: CSSProperties = {
  width: "100%",
  paddingBottom: "40px",
};
const fullWidthTableStyle: CSSProperties = { borderSpacing: "0" };
const outerTdStyle: CSSProperties = { paddingTop: "32px" };
const contentTableStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
  margin: "0 auto",
};
const spacer32Style: CSSProperties = {
  height: "32px",
  lineHeight: "32px",
  fontSize: "0",
};
const logoStyle: CSSProperties = {
  display: "block",
  width: "64px",
  height: "25px",
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
const spacer16Style: CSSProperties = {
  height: "16px",
  lineHeight: "16px",
  fontSize: "0",
};
const footerTableStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
  height: "26px",
};
const mainTextStyle: CSSProperties = {
  fontFamily: "Inter, Arial, sans-serif",
  fontWeight: 500,
  fontSize: "16px",
  lineHeight: "160%",
  letterSpacing: "-0.01em",
  color: "#1c1b1f",
};

export default function RemindInactivePage() {
  return (
    <EmailLayout>
      <div style={containerStyle}>
        <EmailHeader
          imageSrc="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/remind-header.png"
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
                  {/* Main Content Table (360px wide) */}
                  <table
                    role="presentation"
                    width="360"
                    cellPadding="0"
                    cellSpacing="0"
                    style={contentTableStyle}
                  >
                    <tbody>
                      {/* Top Text Section */}
                      <tr>
                        <td valign="top">
                          <EmailText style={mainTextStyle}>
                            Hi {"${customerName}"},
                            <br />
                            <br />
                            Congrats on getting your Oko integration set up!
                            <br />
                            <br />
                            We're excited for you to start building: Oko is the
                            first fully open-source embedded wallet stack,
                            designed to power your users with a simple,
                            universal, non-custodial wallet.
                            <br />
                            <br />
                            As you get ready to go live, we wanted to check in
                            and make sure everything is running smoothly on your
                            side.
                            <br />
                            <br />
                            If we can help you accelerate your launch or fine
                            tune your flow, we are here for you.
                          </EmailText>
                        </td>
                      </tr>

                      <tr>
                        <td height="32" style={spacer32Style}>
                          &nbsp;
                        </td>
                      </tr>

                      {/* Links Section */}
                      <tr>
                        <td valign="top">
                          <EmailText>
                            Here are a few links that may help during
                            integration:
                          </EmailText>
                          <table
                            role="presentation"
                            width="100%"
                            cellPadding="0"
                            cellSpacing="0"
                            style={spacer16Style}
                          >
                            <tbody>
                              <tr>
                                <td height="16">&nbsp;</td>
                              </tr>
                            </tbody>
                          </table>
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
                                  <a
                                    href="https://demo.oko.app/"
                                    style={linkStyle}
                                  >
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
                                  <a
                                    href="https://docs.oko.app/docs"
                                    style={linkStyle}
                                  >
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

                      {/* Bottom Text Section */}
                      <tr>
                        <td valign="top">
                          <EmailText>
                            If you need help at any step, simply reply and we
                            will support you.
                            <br />
                            <br />
                            Excited to see what you build with Oko!
                          </EmailText>
                        </td>
                      </tr>

                      <tr>
                        <td height="32" style={spacer32Style}>
                          &nbsp;
                        </td>
                      </tr>

                      {/* Oko Team Signature */}
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
                                  <EmailText align="center">Oko Team</EmailText>
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

                      {/* Footer Logo */}
                      <tr>
                        <td align="center">
                          <img
                            src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/logo-footer.png"
                            width="64"
                            height="25"
                            alt="Oko logo"
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
        </div>
      </div>
    </EmailLayout>
  );
}
