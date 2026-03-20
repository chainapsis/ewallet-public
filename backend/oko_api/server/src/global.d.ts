import type { ServerState } from "@oko-wallet/oko-api-server-state";
import type { SlackAlertManager } from "@oko-wallet-api/lib/slack_alert_manager";

declare global {
  namespace Express {
    interface Locals extends ServerState {
      slack_alert_manager?: SlackAlertManager;
    }
  }
}

export {};
