import type { EddsaKeypair } from "@oko-wallet/crypto-js/node/ecdhe";
import type { Pool } from "pg";

export interface ServerState {
  db: Pool;
  encryptionSecret: string;
  serverKeypair: EddsaKeypair;
  telegram_bot_token: string;
  is_db_backup_checked: boolean;
  launch_time: string;
  git_hash: string | null;
  version: string;
}
