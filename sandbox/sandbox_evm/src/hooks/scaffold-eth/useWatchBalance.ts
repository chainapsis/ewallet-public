import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { type UseBalanceParameters, useBalance, useBlockNumber } from "wagmi";

import { useTargetNetwork } from "./useTargetNetwork";

/**
 * Wrapper around wagmi's useBalance hook. Updates data on every block change.
 */
export const useWatchBalance = (useBalanceParameters: UseBalanceParameters) => {
  const { targetNetwork } = useTargetNetwork();
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({
    watch: true,
    chainId: targetNetwork.id,
  });
  const { queryKey, ...restUseBalanceReturn } =
    useBalance(useBalanceParameters);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockNumber]);

  return restUseBalanceReturn;
};
