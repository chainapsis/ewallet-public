import type { CSSProperties } from "react";

import { EmailButton } from "@oko-wallet-email-template-2/components/EmailButton";
import { EmailCard } from "@oko-wallet-email-template-2/components/EmailCard";
import { EmailLayout } from "@oko-wallet-email-template-2/components/EmailLayout";
import { EmailText } from "@oko-wallet-email-template-2/components/EmailText";

const S3_BASE =
  "https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/email";

const containerStyle: CSSProperties = { padding: "2px" };

const headerTdStyle: CSSProperties = {
  backgroundImage: `url(${S3_BASE}/light/invite-header.png)`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  borderRadius: "12px",
  textAlign: "center",
  padding: "72px 32px",
};

const headerLogoStyle: CSSProperties = {
  display: "block",
  margin: "0 auto 16px auto",
  width: "64px",
  height: "25px",
};

const headerTitleStyle: CSSProperties = {
  fontFamily: "Inter, Arial, sans-serif",
  fontWeight: 600,
  fontSize: "32px",
  lineHeight: "normal",
  letterSpacing: "-0.96px",
  color: "#ffffff",
  textAlign: "center",
  margin: "0 auto",
  maxWidth: "360px",
};

const bodyTableStyle: CSSProperties = { borderSpacing: "0" };
const bodyTdStyle: CSSProperties = { padding: "32px" };
const mainStyle: CSSProperties = {
  maxWidth: "360px",
  margin: "0 auto",
  borderSpacing: "0",
};
const spacer32Style: CSSProperties = {
  height: "32px",
  lineHeight: "32px",
  fontSize: "0",
};
const spacer24Style: CSSProperties = {
  height: "24px",
  lineHeight: "24px",
  fontSize: "0",
};
const spacer33Style: CSSProperties = {
  height: "33.72px",
  lineHeight: "33.72px",
  fontSize: "0",
};
const footerTableStyle: CSSProperties = {
  width: "360px",
  maxWidth: "100%",
  borderSpacing: "0",
  height: "26px",
};
const logoFooterStyle: CSSProperties = {
  display: "block",
  width: "64px",
  height: "25px",
};

// biome-ignore lint/suspicious/noTemplateCurlyInString: email template placeholder
const DAPP_NAME = "${dapp_name}";
// biome-ignore lint/suspicious/noTemplateCurlyInString: email template placeholder
const INVITE_URL = "${inviteUrl}";

export default function TeamInvitePage() {
  return (
    <EmailLayout>
      <div style={containerStyle}>
        {/* Header with background image via table */}
        <table
          role="presentation"
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{ borderSpacing: "0", borderRadius: "12px" }}
        >
          <tbody>
            <tr>
              <td style={headerTdStyle}>
                <img
                  src={`${S3_BASE}/light/header_logo.png`}
                  alt="Oko"
                  width="64"
                  height="25"
                  style={headerLogoStyle}
                />
                <p style={headerTitleStyle}>
                  You are invited to join the {DAPP_NAME} team
                </p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Body */}
        <table
          role="presentation"
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={bodyTableStyle}
        >
          <tbody>
            <tr>
              <td style={bodyTdStyle}>
                <table
                  role="presentation"
                  width="360"
                  cellPadding="0"
                  cellSpacing="0"
                  align="center"
                  style={mainStyle}
                >
                  <tbody>
                    <tr>
                      <td>
                        <EmailText>
                          Hi there,
                          <br />
                          <br />
                          You&apos;ve been invited to join the {DAPP_NAME}{" "}
                          workspace on Oko.
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
                        <EmailCard padding="48px 32px 48px 32px">
                          <table
                            role="presentation"
                            width="296"
                            align="center"
                            cellPadding="0"
                            cellSpacing="0"
                            style={{
                              width: "296px",
                              maxWidth: "100%",
                              margin: "0 auto",
                              borderSpacing: "0",
                            }}
                          >
                            <tbody>
                              <tr>
                                <td>
                                  <EmailText align="center">
                                    Join now to collaborate!
                                  </EmailText>
                                </td>
                              </tr>
                              <tr>
                                <td height="24" style={spacer24Style}>
                                  &nbsp;
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <EmailButton href={INVITE_URL}>
                                    Accept Invitation
                                  </EmailButton>
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
                        <EmailText>
                          If you have any questions or run into issues while
                          joining, feel free to reach out anytime.
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
                          src={`${S3_BASE}/light/logo-footer.png`}
                          width="64"
                          height="25"
                          alt="Oko logo"
                          style={logoFooterStyle}
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
    </EmailLayout>
  );
}
