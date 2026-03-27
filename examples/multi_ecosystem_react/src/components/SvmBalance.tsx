import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

import { svmConnection } from "@/constants/chains";

export default function SvmBalance() {
  const { address: svmAddress } = useOkoSvm();
  const connection = svmConnection;

  const { data, isLoading } = useQuery({
    queryKey: ["svm-balance", svmAddress],
    enabled: !!svmAddress,
    queryFn: async () => {
      if (!svmAddress) {
        throw new Error("Address is not available");
      }

      const balance = await connection.getBalance(new PublicKey(svmAddress));

      return `${balance / LAMPORTS_PER_SOL} SOL`;
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
