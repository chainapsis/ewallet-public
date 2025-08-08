import { useAppState } from "@keplr-ewallet-sandbox-evm/services/store/app";

export const useKeplrEwallet = () => {
  const ethEWallet = useAppState((state) => state.keplr_sdk_eth);

  return {
    ethEWallet,
  };
};
