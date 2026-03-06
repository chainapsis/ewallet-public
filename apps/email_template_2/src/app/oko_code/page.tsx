import { type CSSProperties } from "react";

import { EmailLayout } from "@oko-wallet-email-template-2/components/EmailLayout";
import { EmailHeader } from "@oko-wallet-email-template-2/components/EmailHeader";
import { EmailCard } from "@oko-wallet-email-template-2/components/EmailCard";
import { EmailText } from "@oko-wallet-email-template-2/components/EmailText";
import { EmailCode } from "@oko-wallet-email-template-2/components/EmailCode";

const containerStyle: CSSProperties = { padding: "2px" };
const bodyWrapperStyle: CSSProperties = { height: "685px", width: "100%" };
const fullWidthTableStyle: CSSProperties = { borderSpacing: "0" };
const outerTdStyle: CSSProperties = { paddingTop: "32px" };
const cardContainerStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
};
const contentTdStyle: CSSProperties = { height: "454px" };
const contentTableStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
  height: "454px",
};
const contentWrapperStyle: CSSProperties = {
  width: "360px",
  height: "454px",
  maxWidth: "100%",
  borderSpacing: "0",
  opacity: 1,
};
const textTableStyle: CSSProperties = {
  width: "360px",
  height: "156px",
  maxWidth: "100%",
  borderSpacing: "0",
  opacity: 1,
};
const textCellStyle: CSSProperties = { height: "156px" };
const spacer32Style: CSSProperties = {
  height: "32px",
  lineHeight: "32px",
  fontSize: "0",
};
const footerTableStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
  height: "26px",
};
const spacer33Style: CSSProperties = {
  height: "33.72px",
  lineHeight: "33.72px",
  fontSize: "0",
};
const logoStyle: CSSProperties = {
  display: "block",
  width: "64px",
  height: "25px",
};

export default function OkoCodePage() {
  return (
    <EmailLayout>
      <div style={containerStyle}>
        <EmailHeader
          imageSrc="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/code-header.png"
          altText="Black Oko header with 'Verify your email to continue' text"
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
                                  <table
                                    role="presentation"
                                    width="360"
                                    cellPadding="0"
                                    cellSpacing="0"
                                    style={contentWrapperStyle}
                                  >
                                    <tbody>
                                      <tr>
                                        <td>
                                          <table
                                            role="presentation"
                                            width="360"
                                            cellPadding="0"
                                            cellSpacing="0"
                                            align="center"
                                            style={textTableStyle}
                                          >
                                            <tbody>
                                              <tr>
                                                <td style={textCellStyle}>
                                                  <EmailText align="center">
                                                    Hi there,
                                                    <br />
                                                    <br />
                                                    Enter this code in the Oko
                                                    dApp Dashboard to verify
                                                    your email. You can update
                                                    your password after
                                                    verification.
                                                    <br />
                                                    The code is valid for{" "}
                                                    <strong>
                                                      {
                                                        "${email_verification_expiration_minutes}"
                                                      }{" "}
                                                      minutes
                                                    </strong>
                                                    .
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
                                        <td>
                                          <EmailCard
                                            height="182px"
                                            padding="22px 32px 24px 32px"
                                          >
                                            <EmailCode code="${verification_code}" />
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
                                          <EmailText align="center">
                                            If you did not request this code,
                                            you can ignore this message.
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
                                <td height="33.72" style={spacer33Style}>
                                  &nbsp;
                                </td>
                              </tr>
                              <tr>
                                <td align="center">
                                  <img
                                    src="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/logo-footer.png"
                                    width="64"
                                    height="25"
                                    alt="Gray Oko logo"
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
        </div>
      </div>
    </EmailLayout>
  );
}
