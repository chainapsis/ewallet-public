import type { CSSProperties } from "react";

import { EmailButton } from "@oko-wallet-email-template-2/components/EmailButton";
import { EmailCard } from "@oko-wallet-email-template-2/components/EmailCard";
import { EmailFooter } from "@oko-wallet-email-template-2/components/EmailFooter";
import { EmailHeader } from "@oko-wallet-email-template-2/components/EmailHeader";
import { EmailLayout } from "@oko-wallet-email-template-2/components/EmailLayout";
import { EmailText } from "@oko-wallet-email-template-2/components/EmailText";

const containerStyle: CSSProperties = { padding: "2px" };
const bodyWrapperStyle: CSSProperties = { height: "972px", width: "100%" };
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

export default function OkoPage() {
  return (
    <EmailLayout>
      <div style={containerStyle}>
        <EmailHeader
          imageSrc="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/header.png"
          altText="Red Oko header with 'Welcome to Oko' text"
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
                                    Hi there,
                                    <br />
                                    <br />
                                    Welcome to Oko, and thanks for integrating
                                    with us!
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
                                    You can now log in to the Oko dApp Dashboard
                                    using the email address you shared with us
                                    and the temporary password below.
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
                                              {
                                                // biome-ignore lint/suspicious/noTemplateCurlyInString: email template placeholder
                                                "${escapedPassword}"
                                              }
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
                                  <EmailFooter />
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
