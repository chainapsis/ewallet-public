import type { EmailResult, SMTPConfig } from "@oko-wallet/oko-types/admin";

import { sendEmail } from "@oko-wallet-admin-api/email";

export async function sendAdminTransferEmail(
  email: string,
  transferUrl: string,
  teamName: string,
  fromEmail: string,
  smtpConfig: SMTPConfig,
): Promise<EmailResult> {
  const subject = `You've been requested to become an admin of ${teamName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"/></head>
    <body style="font-family: Inter, Arial, sans-serif; background-color: #ededed; padding: 32px 0;">
      <table align="center" role="presentation" cellpadding="0" cellspacing="0" style="width: 600px; max-width: 100%; margin: 0 auto;">
        <tr>
          <td style="background-color: #ffffff; border-radius: 16px; padding: 40px 32px;">
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 160%; color: #1c1b1f;">
              Hi there,<br/><br/>
              An admin of <strong>${teamName}</strong> has requested to transfer the admin role to you.
              Click the button below to accept.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: #1c1b1f; border-radius: 8px; padding: 12px 32px;">
                  <a href="${transferUrl}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                    Accept Admin Role
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin: 24px 0 0; font-size: 14px; line-height: 160%; color: #6b6b6b;">
              This request will expire in 7 days.<br/>
              If you do not wish to accept, you can ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail(
    {
      from: fromEmail,
      to: email,
      subject,
      html,
    },
    smtpConfig,
  );
}
