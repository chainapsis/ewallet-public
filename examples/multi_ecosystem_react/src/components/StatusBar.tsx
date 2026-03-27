import { useCosmosAddress } from "@oko-wallet/oko-sdk-react/cosmos";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";

import { cosmosChainInfo } from "@/constants/chains";
import CopyableAddress from "./CopyableAddress";
import CosmosBalance from "./CosmosBalance";
import EvmBalance from "./EvmBalance";
import SvmBalance from "./SvmBalance";

function StatusBar() {
  const { address: bech32Address } = useCosmosAddress(cosmosChainInfo.chainId);
  const { address } = useOkoEth();
  const { address: svmAddress } = useOkoSvm();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-widget border border-widget-border rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">
          Cosmos{" "}
          <span className="text-sm text-gray-300">(Osmosis Testnet)</span>
        </h3>
        {bech32Address ? (
          <CopyableAddress value={bech32Address} />
        ) : (
          <div className="text-sm opacity-70">-</div>
        )}
        <CosmosBalance />
      </div>
      <div className="bg-widget border border-widget-border rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">
          EVM <span className="text-sm text-gray-300">(Ethereum Sepolia)</span>
        </h3>
        {address ? (
          <CopyableAddress value={address} />
        ) : (
          <div className="text-sm opacity-70">-</div>
        )}
        <EvmBalance />
      </div>
      <div className="bg-widget border border-widget-border rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">
          SVM <span className="text-sm text-gray-300">(Solana Devnet)</span>
        </h3>
        {svmAddress ? (
          <CopyableAddress value={svmAddress} />
        ) : (
          <div className="text-sm opacity-70">-</div>
        )}
        <SvmBalance />
      </div>
    </div>
  );
}

export default StatusBar;
