import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool } from "pg";

import type {
  TssActivationKey,
  TssActivationSetting,
} from "@oko-wallet-types/tss_activate";

export async function insertTssActivationSetting(
  db: Pool,
  activationKey: TssActivationKey,
  isEnabled: boolean,
  description: string,
) {
  const query = `
		INSERT INTO tss_activation_settings (
			activation_key, is_enabled, description
		) VALUES (
			$1, $2, $3
		) 
    RETURNING *
	`;
  const values = [activationKey, isEnabled, description];

  try {
    const result = await db.query<TssActivationSetting>(query, values);
    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Failed to insert tss activation setting",
      };
    }

    return {
      success: true,
      data: row,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getTssActivationSetting(
  db: Pool,
  activationKey: TssActivationKey,
): Promise<Result<TssActivationSetting | null, string>> {
  const query = `
		SELECT * FROM tss_activation_settings
		WHERE activation_key = $1
	`;

  const values = [activationKey];
  try {
    const result = await db.query<TssActivationSetting>(query, values);

    const row = result.rows[0];
    if (!row) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: row,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function setTssActivationSetting(
  db: Pool,
  isEnabled: boolean,
  activationKey: TssActivationKey,
): Promise<Result<TssActivationSetting, string>> {
  const query = `
		UPDATE tss_activation_settings
		SET is_enabled = $1, updated_at = now()
		WHERE activation_key = $2
		RETURNING *
	`;
  const values = [isEnabled, activationKey];

  try {
    const result = await db.query<TssActivationSetting>(query, values);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: `Failed to set tss activation setting: ${activationKey}`,
      };
    }

    return {
      success: true,
      data: row,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}
