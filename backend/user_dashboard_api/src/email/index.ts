import type {
  EmailResult,
  SendEmailOptions,
  SMTPConfig,
} from "@oko-wallet/oko-types/admin";
import nodemailer from "nodemailer";

export function sendEmailWithTransporter(
  transporter: nodemailer.Transporter,
  options: SendEmailOptions,
): Promise<nodemailer.SentMessageInfo> {
  return transporter.sendMail(options);
}

export async function sendEmail(
  options: SendEmailOptions,
  smtp_config: SMTPConfig,
): Promise<EmailResult> {
  try {
    const transporter = nodemailer.createTransport({
      host: smtp_config.smtp_host,
      port: smtp_config.smtp_port,
      auth: {
        user: smtp_config.smtp_user,
        pass: smtp_config.smtp_pass,
      },
      secure: false, // false for 587(SMRTTLS)
    });
    const info = await transporter.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: `Email send error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(
  email: string,
  verification_code: string,
  customer_label: string,
  from_email: string,
  email_verification_expiration_minutes: number,
  smtp_config: SMTPConfig,
): Promise<EmailResult> {
  const subject = `Verification Code for ${customer_label}`;

  const text = `
Your verification code is: ${verification_code}

This code will expire in ${email_verification_expiration_minutes} minutes.

If you didn't request this code, please ignore this email.
  `;

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Email Verification</h2>
  <p>Your verification code for <strong>${customer_label}</strong> is:</p>
  
  <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">
      ${verification_code}
    </span>
  </div>
  
  <p style="color: #666;">This code will expire in ${email_verification_expiration_minutes} minutes.</p>
  
  <p style="color: #999; font-size: 12px;">
    If you didn't request this code, please ignore this email.
  </p>
</div>
  `;

  console.info(
    "Sending verification email, email: %s, content len: %s",
    email,
    html.length,
  );

  return sendEmail(
    {
      from: from_email,
      to: email,
      subject,
      text,
      html,
    },
    smtp_config,
  );
}

// Test SMTP connection and transporter
export function getTransporter(
  host: string,
  port: number,
  user: string,
  pass: string,
): nodemailer.Transporter {
  return nodemailer.createTransport({
    host,
    port,
    auth: {
      user,
      pass,
    },
    secure: false, // false for 587(SMRTTLS)
  });
}

// FOR TEST
export async function testEmailConnection(
  host: string,
  port: number,
  user: string,
  pass: string,
): Promise<boolean> {
  try {
    const transporter = getTransporter(host, port, user, pass);
    await transporter.verify();
    console.log("SMTP connection verified");
    return true;
  } catch (error) {
    console.error("SMTP connection failed:", error);
    return false;
  }
}
