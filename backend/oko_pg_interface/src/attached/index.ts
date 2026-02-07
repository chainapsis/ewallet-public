import type { Customer, CustomerTheme } from "@oko-wallet/oko-types/customers";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";

function normalizeCustomerTheme(
  value?: CustomerTheme,
): CustomerTheme | undefined {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return undefined;
}

interface GetCustomerThemeByHostOriginResult {
  theme: CustomerTheme;
}
export async function getCustomerThemeByHostOrigin(
  db: Pool | PoolClient,
  hostOrigin: string,
): Promise<Result<GetCustomerThemeByHostOriginResult, string>> {
  const query = `
SELECT customer_id, theme
FROM customers
WHERE status = 'ACTIVE' AND (url = $1 OR url LIKE ($1 || '/%'))
LIMIT 1
`;
  try {
    const result = await db.query<Customer>(query, [hostOrigin]);
    const row = result.rows[0];

    if (!row) {
      return { success: false, err: "Customer not found" };
    }
    const theme = normalizeCustomerTheme(row.theme);
    if (!theme) {
      return { success: false, err: "Customer theme not found" };
    }
    return {
      success: true,
      data: {
        theme,
      },
    };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}
