import { sendInactiveAppReminderEmail } from "@oko-wallet/ct-dashboard-api/src/email/inactive_reminder";
import { getInactiveCustomerDashboardUsers } from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import { insertEmailSentLog } from "@oko-wallet/oko-pg-interface/email_sent_logs";
import type { SMTPConfig } from "@oko-wallet/oko-types/admin";
import type { Pool } from "pg";
import type { Logger } from "winston";

import { sleep } from "@oko-wallet-api/utils";

export interface InactiveCustomerUserReminderRuntimeConfig {
  intervalSeconds: number;
  timeUntilInactiveMs: number; // milliseconds
  smtpConfig: SMTPConfig;
  fromEmail: string;
}

export function startInactiveCustomerUserReminderRuntime(
  db: Pool,
  logger: Logger,
  config: InactiveCustomerUserReminderRuntimeConfig,
) {
  logger.info(
    "Starting inactive user reminder runtime with interval %d seconds",
    config.intervalSeconds,
  );

  const run = async () => {
    try {
      logger.info(
        "Inactive user reminder runtime: checking for inactive users",
      );
      const inactiveCustomerDashboardUsersRes =
        await getInactiveCustomerDashboardUsers(db, config.timeUntilInactiveMs);

      if (!inactiveCustomerDashboardUsersRes.success) {
        logger.error(
          "Inactive user reminder runtime: failed to get inactive users: %s",
          inactiveCustomerDashboardUsersRes.err,
        );
        return;
      }

      const customerDashboardUsers = inactiveCustomerDashboardUsersRes.data;
      if (customerDashboardUsers.length === 0) {
        return;
      }

      logger.info(
        "Inactive user reminder runtime: found %d inactive users to remind",
        customerDashboardUsers.length,
      );

      for (const customerDashboardUser of customerDashboardUsers) {
        try {
          const emailRes = await sendInactiveAppReminderEmail(
            customerDashboardUser.user.email,
            customerDashboardUser.label,
            config.fromEmail,
            config.smtpConfig,
          );

          if (!emailRes.success) {
            logger.error(
              "Inactive user reminder runtime: failed to send inactive reminder email to %s: %s",
              customerDashboardUser.user.email,
              emailRes.error,
            );
            continue;
          }

          const recordRes = await insertEmailSentLog(db, {
            target_id: customerDashboardUser.user.user_id,
            type: "INACTIVE_CUSTOMER_USER",
            email: customerDashboardUser.user.email,
          });

          if (!recordRes.success) {
            logger.error(
              "Inactive user reminder runtime: failed to insert email sent log for %s: %s",
              customerDashboardUser.user.user_id,
              recordRes.err,
            );
          } else {
            logger.info(
              "Inactive user reminder runtime: sent inactive reminder to customer user %s (%s, user_id: %s)",
              customerDashboardUser.label,
              customerDashboardUser.customer_id,
              customerDashboardUser.user.user_id,
            );
          }

          await sleep(1500); // sleep for 1.5 seconds to avoid overwhelming the email server
        } catch (err) {
          logger.error(
            "Inactive user reminder runtime: error processing inactive user %s: %s",
            customerDashboardUser.customer_id,
            err,
          );
        }
      }
    } catch (error) {
      logger.error("Inactive user reminder runtime: error: %s", error);
    }
  };

  // Initial run
  run();

  // Schedule
  setInterval(run, config.intervalSeconds * 1000);
}
