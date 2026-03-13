import { useQuery } from "@tanstack/react-query";

import { getTssAllActivationSetting } from "@oko-wallet-admin/fetch/tss";
import { useAppState } from "@oko-wallet-admin/state";

export function useGetTssAllActivationSetting() {
  const { token } = useAppState();

  const query = useQuery({
    queryKey: ["tss-activation-setting"],
    queryFn: async () => {
      if (!token) {
        return null;
      }
      const response = await getTssAllActivationSetting({ token });
      if (!response.success) {
        return null;
      }
      return response.data;
    },
    enabled: !!token,
  });

  return query;
}
