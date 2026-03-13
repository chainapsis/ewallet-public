import scaffoldConfig from "@oko-wallet-sandbox-evm/../scaffold.config";
import { useGlobalState } from "@oko-wallet-sandbox-evm/services/store/store";
import type { AllowedChainIds } from "@oko-wallet-sandbox-evm/utils/scaffold-eth";
import {
  type ChainWithAttributes,
  NETWORKS_EXTRA_DATA,
} from "@oko-wallet-sandbox-evm/utils/scaffold-eth/networks";

/**
 * Given a chainId, retrives the network object from `scaffold.config`,
 * if not found default to network set by `useTargetNetwork` hook
 */
export function useSelectedNetwork(
  chainId?: AllowedChainIds,
): ChainWithAttributes {
  const globalTargetNetwork = useGlobalState(
    ({ targetNetwork }) => targetNetwork,
  );
  const targetNetwork = scaffoldConfig.targetNetworks.find(
    (targetNetwork) => targetNetwork.id === chainId,
  );

  if (targetNetwork) {
    return { ...targetNetwork, ...NETWORKS_EXTRA_DATA[targetNetwork.id] };
  }

  return globalTargetNetwork;
}
