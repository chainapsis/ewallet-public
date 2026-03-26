import { useContext, useEffect, useState } from "react";

import { CosmosContext } from "./context";

export interface UseCosmosAddressReturn {
  address: string | null;
  isLoading: boolean;
}

export function useCosmosAddress(chainId: string): UseCosmosAddressReturn {
  const ctx = useContext(CosmosContext);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!ctx.instance || !ctx.isReady) {
      setAddress(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    ctx.instance
      .getKey(chainId)
      .then((key) => {
        if (!cancelled) {
          setAddress(key.bech32Address ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAddress(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ctx.instance, ctx.isReady, chainId]);

  useEffect(() => {
    if (!ctx.instance) {
      return;
    }

    const instance = ctx.instance;
    let cancelled = false;

    const handler = () => {
      setIsLoading(true);
      instance
        .getKey(chainId)
        .then((key) => {
          if (!cancelled) {
            setAddress(key.bech32Address ?? null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAddress(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });
    };

    instance.on({
      type: "accountsChanged",
      handler,
    });

    return () => {
      cancelled = true;
      instance.off({
        type: "accountsChanged",
        handler,
      });
    };
  }, [ctx.instance, chainId]);

  return { address, isLoading };
}
