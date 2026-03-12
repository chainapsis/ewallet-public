import type {
  EmailResult,
  SendEmailOptions,
} from "@oko-wallet/oko-types/admin";
import dotenv from "dotenv";
import path from "path";

import {
  getTransporter,
  sendEmail,
  sendEmailWithTransporter,
  testEmailConnection,
} from "@oko-wallet-usrd-api/email";

dotenv.config({
  path: path.resolve(__dirname, "../../.env.local"),
  override: false,
});

describe("Email Service Integration Tests", () => {
  const testEmail = "atmosis@yopmail.com";

  beforeAll(() => {
    // Verify required environment variables are loaded
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      console.warn(
        "SMTP environment variables not configured. Integration tests may fail.",
      );
    }
  });

  describe("testEmailConnection", () => {
    it("should verify SMTP connection", async () => {
      const isConnected = await testEmailConnection(
        process.env.SMTP_HOST || "",
        parseInt(process.env.SMTP_PORT || "587", 10),
        process.env.SMTP_USER || "",
        process.env.SMTP_PASS || "",
      );
      console.log("isConnected: ", isConnected);

      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        expect(isConnected).toBe(true);
      } else {
        console.warn(
          "SMTP credentials not configured, skipping connection test",
        );
      }
    }, 10000);
  });

  describe("sendEmail", () => {
    it("should send real email successfully", async () => {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn(
          "SMTP credentials not configured, skipping email send test",
        );
        return;
      }

      const transporter = getTransporter(
        process.env.SMTP_HOST || "",
        parseInt(process.env.SMTP_PORT || "587", 10),
        process.env.SMTP_USER || "",
        process.env.SMTP_PASS || "",
      );
      const emailOptions: SendEmailOptions = {
        from: process.env.FROM_EMAIL || "no-reply@example.com",
        to: testEmail,
        subject: "Integration Test Email",
        text: "This is a test email from the integration test suite.",
        html: "<p>This is a <strong>test email</strong> from the integration test suite.</p>",
      };

      const result = await sendEmailWithTransporter(transporter, emailOptions);

      expect(result.accepted?.[0]).toBe(testEmail);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
    }, 15000);

    it("should handle email sending failure gracefully", async () => {
      const emailOptions: SendEmailOptions = {
        from: "invalid@invalid.com",
        to: "invalid@invalid.com",
        subject: "Test Email",
        text: "This should fail",
      };

      const result: EmailResult = await sendEmail(emailOptions, {
        smtp_host: process.env.SMTP_HOST || "",
        smtp_port: parseInt(process.env.SMTP_PORT || "587", 10),
        smtp_user: process.env.SMTP_USER || "",
        smtp_pass: process.env.SMTP_PASS || "",
      });

      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not configured, expected failure");
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    }, 15000);
  });
});
