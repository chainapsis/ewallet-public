import { generatePassword } from "@oko-wallet/admin-api/utils/password";
import { hashPassword } from "@oko-wallet/crypto-js";
import { sendUnverifiedUserReminderEmail } from "@oko-wallet/ct-dashboard-api/src/email/unverified_reminder";
import {
  getUnverifiedCustomerDashboardUsers,
  updateCustomerDashboardUserPassword,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import { insertEmailSentLog } from "@oko-wallet/oko-pg-interface/email_sent_logs";
import type { SMTPConfig } from "@oko-wallet/oko-types/admin";
import type { Pool } from "pg";
import type { Logger } from "winston";

import { sleep } from "@oko-wallet-api/utils";

export interface UnverifiedCustomerUserReminderRuntimeConfig {
  intervalSeconds: number;
  timeUntilVerifiedMs: number; // milliseconds
  smtpConfig: SMTPConfig;
  fromEmail: string;
}

export function startUnverifiedCustomerUserReminderRuntime(
  db: Pool,
  logger: Logger,
  config: UnverifiedCustomerUserReminderRuntimeConfig,
) {
  logger.info(
    "Starting unverified user reminder runtime with interval %d seconds",
    config.intervalSeconds,
  );

  const run = async () => {
    try {
      logger.info(
        "Unverified user reminder runtime: checking for unverified users",
      );
      const unverifiedUsersRes = await getUnverifiedCustomerDashboardUsers(
        db,
        config.timeUntilVerifiedMs,
      );

      if (!unverifiedUsersRes.success) {
        logger.error(
          "Unverified user reminder runtime: failed to get unverified users: %s",
          unverifiedUsersRes.err,
        );
        return;
      }

      const users = unverifiedUsersRes.data;
      if (users.length === 0) {
        return;
      }

      logger.info(
        "Unverified user reminder runtime: found %d unverified users to remind",
        users.length,
      );

      for (const user of users) {
        try {
          // Generate new temporary password
          const temporaryPassword = generatePassword();

          // Send email first (outside transaction to avoid holding
          // DB connection)
          const emailRes = await sendUnverifiedUserReminderEmail(
            user.user.email,
            user.label,
            temporaryPassword,
            config.fromEmail,
            config.smtpConfig,
          );

          if (!emailRes.success) {
            logger.error(
              "Unverified user reminder runtime: failed to send unverified reminder email to %s: %s",
              user.user.email,
              emailRes.error,
            );
            continue;
          }

          // Start transaction after email is sent successfully
          const client = await db.connect();
          try {
            await client.query("BEGIN");

            // Hash the password
            const passwordHash = await hashPassword(temporaryPassword);

            // Update user password in DB
            const updateRes = await updateCustomerDashboardUserPassword(
              client,
              {
                user_id: user.user.user_id,
                password_hash: passwordHash,
              },
            );

            if (!updateRes.success) {
              throw new Error(updateRes.err);
            }

            // Record email sent log
            const recordRes = await insertEmailSentLog(client, {
              target_id: user.user.user_id,
              type: "UNVERIFIED_CUSTOMER_USER",
              email: user.user.email,
            });

            if (!recordRes.success) {
              throw new Error(recordRes.err);
            }

            await client.query("COMMIT");

            logger.info(
              "Unverified user reminder runtime: sent unverified reminder to customer user %s (%s, user_id: %s)",
              user.label,
              user.customer_id,
              user.user.user_id,
            );
          } catch (err) {
            await client.query("ROLLBACK");
            logger.error(
              "Unverified user reminder runtime: error processing unverified user %s: %s",
              user.customer_id,
              err,
            );
          } finally {
            client.release();
          }

          await sleep(1500); // sleep for 1.5 seconds to avoid overwhelming the email server
        } catch (err) {
          logger.error(
            "Unverified user reminder runtime: error processing unverified user %s: %s",
            user.customer_id,
            err,
          );
        }
      }
    } catch (error) {
      logger.error("Unverified user reminder runtime: error: %s", error);
    }
  };

  // Initial run
  run();

  // Schedule
  setInterval(run, config.intervalSeconds * 1000);
}
