import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { requestGetTeamMembers } from "@oko-wallet-ct-dashboard/fetch/team";
import { useAppState } from "@oko-wallet-ct-dashboard/state";

const TEAM_MEMBERS_KEY_PREFIX = "team-members";

export const useTeamMembers = () => {
  const token = useAppState((state) => state.token);
  const queryKey = [TEAM_MEMBERS_KEY_PREFIX, token ?? ""];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const res = await requestGetTeamMembers({
        token: token ?? "",
        limit: 1000,
      });
      if (!res.success) {
        return null;
      }
      return res.data;
    },
    enabled: !!token,
  });
};

export const useInvalidateTeamMembers = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [TEAM_MEMBERS_KEY_PREFIX],
    });
  }, [queryClient]);
};
