import type { Pool } from "pg";
import type { Logger } from "winston";
import { insertUserCustomerConnectionIfNotExists } from "@oko-wallet/oko-pg-interface/user_customer_connections";

export async function saveUserCustomerConnection(
  db: Pool,
  logger: Logger,
  userId: string,
  customerId: string,
): Promise<void> {
  try {
    const upsertRes = await insertUserCustomerConnectionIfNotExists(db, userId, customerId);

    if (!upsertRes.success) {
      logger.warn(`[connection] Failed to insert user-customer connection: ${upsertRes.err}`);
      return;
    }

  } catch (error) {
    logger.error(`[connection] Error inserting user-customer connection: ${error}`);
  }
}
