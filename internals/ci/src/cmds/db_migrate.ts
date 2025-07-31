import { spawnSync } from "node:child_process";

import { paths } from "../paths";

export async function dbMigrate(...args: any[]) {
  console.log(
    "db_migrate, args: %j, ewallet credential vault pg interface path: %s",
    args,
    paths.credential_vault_pg_interface,
  );

  spawnSync("yarn", ["run", "migrate"], {
    cwd: paths.credential_vault_pg_interface,
    stdio: "inherit",
  });
}
