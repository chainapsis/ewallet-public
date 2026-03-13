import { useSelectedNetwork } from "@oko-wallet-sandbox-evm/hooks/scaffold-eth";
import type {
  AllowedChainIds,
  ChainWithAttributes,
} from "@oko-wallet-sandbox-evm/utils/scaffold-eth";

export const DEFAULT_NETWORK_COLOR: [string, string] = ["#666666", "#bbbbbb"];

export function getNetworkColor(
  network: ChainWithAttributes,
  isDarkMode: boolean,
) {
  const colorConfig = network.color ?? DEFAULT_NETWORK_COLOR;
  return Array.isArray(colorConfig)
    ? isDarkMode
      ? colorConfig[1]
      : colorConfig[0]
    : colorConfig;
}

/**
 * Gets the color of the target network
 */
export const useNetworkColor = (chainId?: AllowedChainIds) => {
  const chain = useSelectedNetwork(chainId);
  const isDarkMode = false;

  return getNetworkColor(chain, isDarkMode);
};
