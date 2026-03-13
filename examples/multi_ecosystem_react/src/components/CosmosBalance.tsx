import { StargateClient } from "@cosmjs/stargate";
import { CoinPretty } from "@keplr-wallet/unit";
import { useQuery } from "@tanstack/react-query";

import useCosmos from "@/oko/useCosmos";

export default function CosmosBalance() {
  const { bech32Address, chainInfo } = useCosmos();

  const { data, isLoading } = useQuery({
    queryKey: ["cosmos-balance", bech32Address],
    enabled: !!bech32Address,
    queryFn: async () => {
      if (!bech32Address) {
        throw new Error("Bech32 address or chain info is not available");
      }

      const client = await StargateClient.connect(chainInfo.rpc);
      const bal = await client.getBalance(bech32Address!, "uosmo");
      return new CoinPretty(chainInfo.currencies[0], bal.amount).toString();
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
