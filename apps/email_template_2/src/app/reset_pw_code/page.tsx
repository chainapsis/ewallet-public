import { type CSSProperties } from "react";

import { EmailLayout } from "@oko-wallet-email-template-2/components/EmailLayout";
import { EmailHeader } from "@oko-wallet-email-template-2/components/EmailHeader";
import { EmailCard } from "@oko-wallet-email-template-2/components/EmailCard";
import { EmailText } from "@oko-wallet-email-template-2/components/EmailText";
import { EmailCode } from "@oko-wallet-email-template-2/components/EmailCode";

const containerStyle: CSSProperties = { padding: "2px" };
const bodyWrapperStyle: CSSProperties = { width: "100%" };
const fullWidthTableStyle: CSSProperties = { borderSpacing: "0" };
const outerTdStyle: CSSProperties = { paddingTop: "32px" };
const contentTableStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
};
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
const cardPadding = "48px 32px";

export default function ResetPwCodePage() {
  return (
    <EmailLayout>
      <div style={containerStyle}>
        <EmailHeader
          imageSrc="https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email/light/reset_code_header.png"
          altText="Oko password reset code header"
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
                    style={contentTableStyle}
                  >
                    <tbody>
                      <tr>
                        <td>
                          <EmailText align="center">
                            Enter this code in your Oko Dashboard to reset your
                            password.
                            <br />
                            The code is valid for{" "}
                            {"${email_verification_expiration_minutes}"} minute
                            for your security.
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
                          <EmailCard padding={cardPadding}>
                            <EmailCode
                              code="${verification_code}"
                              title={
                                <>
                                  Your 6-digit code
                                  <br />
                                  for changing your password
                                </>
                              }
                            />
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
                            If you didn't make this request, you can safely
                            delete this email.
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
                                  <EmailText align="center">Oko Team</EmailText>
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
        </div>
      </div>
    </EmailLayout>
  );
}
