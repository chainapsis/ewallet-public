import type { ServerState } from "@oko-wallet/oko-api-server-state";

declare global {
  namespace Express {
    interface Locals extends ServerState { }
  }
}

export { };
