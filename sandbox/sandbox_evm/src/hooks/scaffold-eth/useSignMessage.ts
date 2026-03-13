import { useState } from "react";
import type { Hex, WalletClient } from "viem";

export function useSignMessage() {
  const [signature, setSignature] = useState<Hex | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signMessage = async (
    walletClient: WalletClient,
    message: string,
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!walletClient.account?.address) {
        throw new Error("No account connected");
      }

      const signature = await walletClient.signMessage({
        account: walletClient.account.address,
        message,
      });

      setSignature(signature);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Signing failed");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signMessage,
    signature,
    isLoading,
    error,
    reset: () => {
      setSignature(null);
      setError(null);
    },
  };
}
