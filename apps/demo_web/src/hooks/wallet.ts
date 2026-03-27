import { useOko } from "@oko-wallet/oko-sdk-react";
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import type { OkoSvmWalletInterface } from "@oko-wallet/oko-sdk-svm";
import type { Result } from "@oko-wallet/stdlib-js";
import { useEffect, useRef, useState } from "react";

import { COSMOS_CHAIN_ID } from "@oko-wallet-demo-web/constants/cosmos";

export function useAddresses() {
  const { cosmosWallet: okoCosmos } = useOkoCosmos();
  const { ethWallet: okoEth } = useOkoEth();
  const { svmWallet: okoSvm } = useOkoSvm();
  const { isSignedIn } = useOko();
  const isSignedRef = useRef(isSignedIn);
  isSignedRef.current = isSignedIn;

  const [cosmosAddress, setCosmosAddress] = useState<string | null>(null);
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      if (cosmosAddress) {
        setCosmosAddress(null);
      }

      if (ethAddress) {
        setEthAddress(null);
      }

      if (solanaAddress) {
        setSolanaAddress(null);
      }
      return;
    }

    const loadAddresses = async () => {
      try {
        const promises: Promise<any>[] = [];

        if (okoCosmos) {
          promises.push(
            okoCosmos.getKey(COSMOS_CHAIN_ID).then((key) => {
              if (isSignedRef.current) {
                setCosmosAddress(key.bech32Address);
              }
            }),
          );
        }

        if (okoEth) {
          promises.push(
            okoEth.getAddress().then((addr) => {
              if (isSignedRef.current) {
                setEthAddress(addr);
              }
            }),
          );
        }

        if (okoSvm) {
          promises.push(
            new Promise((resolve, reject) => {
              connectSol(okoSvm, isSignedRef.current, setSolanaAddress)
                .then(resolve)
                .catch(reject);
            }),
          );
        }

        await Promise.all(promises);
      } catch (err) {
        console.error("Failed to load addresses:", err);
      }
    };

    if (isSignedIn) {
      loadAddresses();
    }
  }, [
    isSignedIn,
    okoCosmos,
    okoEth,
    okoSvm,
    cosmosAddress,
    ethAddress,
    solanaAddress,
  ]);

  return { cosmosAddress, ethAddress, solanaAddress };
}

async function connectSol(
  okoSvm: OkoSvmWalletInterface,
  isSignedRef: boolean,
  setSolanaAddress: (pk: string) => void,
): Promise<Result<void, any>> {
  try {
    // this might have been done in lazyInit()
    if (!okoSvm.connected) {
      await okoSvm.connect();
    }

    if (okoSvm.publicKey && isSignedRef) {
      setSolanaAddress(okoSvm.publicKey.toBase58());
    }

    return { success: true, data: void 0 };
  } catch (err: any) {
    console.error("Failed to get Solana address:", err);
    return { success: false, err };
  }
}
