import type { EmailResult, SMTPConfig } from "@oko-wallet/oko-types/admin";

import { sendEmail } from "@oko-wallet-admin-api/email";

export async function sendTeamInvitationEmail(
  email: string,
  inviteUrl: string,
  teamName: string,
  fromEmail: string,
  smtpConfig: SMTPConfig,
): Promise<EmailResult> {
  const subject = `You've been invited to join ${teamName} on Oko`;

  // TEMPORARY: Placeholder email template. Will be replaced with a branded design.
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
              You've been invited to join <strong>${teamName}</strong> on Oko.
              Click the button below to accept the invitation.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: #1c1b1f; border-radius: 8px; padding: 12px 32px;">
                  <a href="${inviteUrl}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                    Accept Invitation
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin: 24px 0 0; font-size: 14px; line-height: 160%; color: #6b6b6b;">
              This invitation will expire in 7 days.<br/>
              If you did not expect this invitation, you can ignore this email.
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
