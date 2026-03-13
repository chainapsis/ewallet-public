import { useEffect, useMemo } from "react";
import { useAccount } from "wagmi";

import scaffoldConfig from "@oko-wallet-sandbox-evm/../scaffold.config";
import { useGlobalState } from "@oko-wallet-sandbox-evm/services/store/store";
import {
  type ChainWithAttributes,
  NETWORKS_EXTRA_DATA,
} from "@oko-wallet-sandbox-evm/utils/scaffold-eth";

/**
 * Retrieves the connected wallet's network from scaffold.config or defaults to the 0th network in the list if the wallet is not connected.
 */
export function useTargetNetwork(): { targetNetwork: ChainWithAttributes } {
  const { chain } = useAccount();
  const targetNetwork = useGlobalState(({ targetNetwork }) => targetNetwork);
  const setTargetNetwork = useGlobalState(
    ({ setTargetNetwork }) => setTargetNetwork,
  );

  useEffect(() => {
    const newSelectedNetwork = scaffoldConfig.targetNetworks.find(
      (targetNetwork) => targetNetwork.id === chain?.id,
    );
    if (newSelectedNetwork && newSelectedNetwork.id !== targetNetwork.id) {
      setTargetNetwork({
        ...newSelectedNetwork,
        ...NETWORKS_EXTRA_DATA[newSelectedNetwork.id],
      });
    }
  }, [chain?.id, setTargetNetwork, targetNetwork.id]);

  return useMemo(() => ({ targetNetwork }), [targetNetwork]);
}
