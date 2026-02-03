import { useQuery } from "@tanstack/react-query";

import {
  selectCosmosSDK,
  useSDKState,
} from "@oko-wallet-user-dashboard/state/sdk";

// Types for connected apps (internal to user_dashboard)
export interface ConnectedApp {
  customer_id: string;
  label: string | null;
  logo_url: string | null;
  url: string | null;
  connected_at: string;
  state: string;
}

export type GetConnectedAppsError =
  | { type: "unauthorized_origin" }
  | { type: "not_authenticated" }
  | { type: "fetch_error"; error: string };

interface GetConnectedAppsAckPayload {
  success: boolean;
  data?: ConnectedApp[];
  err?: GetConnectedAppsError;
}

interface UseConnectedAppsResult {
  apps: ConnectedApp[];
  isLoading: boolean;
  error: GetConnectedAppsError | null;
}

export function useConnectedApps(): UseConnectedAppsResult {
  const cosmosSDK = useSDKState(selectCosmosSDK);

  const { data, isLoading, error } = useQuery<
    ConnectedApp[],
    GetConnectedAppsError
  >({
    queryKey: ["connectedApps"],
    queryFn: async () => {
      // biome-ignore lint/style/noNonNullAssertion: enabled flag guarantees cosmosSDK is defined
      const res = await cosmosSDK!.okoWallet.sendMsgToIframe({
        target: "oko_attached",
        msg_type: "__get_connected_apps__",
        payload: null,
      } as any);

      //NOTE: get_connected_apps is a msg specific to user_dashboard, so it need to be casted to as unknown here.
      const resAny = res as unknown as {
        msg_type: "__get_connected_apps_ack__";
        payload: GetConnectedAppsAckPayload;
      };
      if (resAny.msg_type === "__get_connected_apps_ack__") {
        const payload = resAny.payload;
        if (payload.success && payload.data) {
          return payload.data;
        }
        if (payload.err) {
          throw payload.err;
        }
      }

      return [];
    },
    enabled: !!cosmosSDK,
  });

  return { apps: data ?? [], isLoading, error: error ?? null };
}
