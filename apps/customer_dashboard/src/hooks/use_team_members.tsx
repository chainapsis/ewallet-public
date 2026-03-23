import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { requestGetTeamMembers } from "@oko-wallet-ct-dashboard/fetch/team";
import { useAppState } from "@oko-wallet-ct-dashboard/state";

const TEAM_MEMBERS_QUERY_KEY = ["team-members"];

export const useTeamMembers = () => {
  const token = useAppState((state) => state.token);

  return useQuery({
    queryKey: TEAM_MEMBERS_QUERY_KEY,
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
    queryClient.invalidateQueries({ queryKey: TEAM_MEMBERS_QUERY_KEY });
  }, [queryClient]);
};
