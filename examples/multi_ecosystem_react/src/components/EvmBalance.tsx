import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";

import { evmPublicClient } from "@/constants/chains";

export default function EvmBalance() {
  const { address } = useOkoEth();
  const publicClient = evmPublicClient;

  const { data, isLoading } = useQuery({
    queryKey: ["evm-balance", address],
    enabled: !!address,
    queryFn: async () => {
      if (!address) {
        throw new Error("Address or provider is not available");
      }

      const balance = await publicClient.getBalance({
        address: address,
      });

      return `${formatEther(balance)} ETH`;
    },
  });

  return (
    <div className="bg-widget-field border border-widget-border rounded-2xl px-6 py-6 hover:border-widget-border-hover transition-colors">
      <div className="text-2xl font-semibold bg-linear-to-r from-white to-gray-300 bg-clip-text text-transparent leading-tight">
        {isLoading ? "..." : (data ?? "-")}
      </div>
    </div>
  );
}
