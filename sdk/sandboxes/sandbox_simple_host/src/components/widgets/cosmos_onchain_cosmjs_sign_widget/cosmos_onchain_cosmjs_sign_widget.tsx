import React, { useEffect, useState } from "react";
import { MsgSend } from "@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx";
import { coin } from "@cosmjs/amino";

import { GasPrice, SigningStargateClient } from "@cosmjs/stargate";
import {
  makeMockSendTokenAminoSignDoc,
  makeMockSendTokenProtoSignDoc,
} from "@/utils/cosmos";
import styles from "./cosmos_onchain_cosmjs_sign_widget.module.scss";
import { useKeplrEwallet } from "@/components/keplr_ewallet_provider/use_keplr_ewallet";

const TEST_CHAIN_ID = "osmosis-1";
const TEST_CHAIN_RPC = "https://osmosis-rpc.publicnode.com:443";

const useGetCosmosAccountInfo = () => {
  const { cosmosEWallet } = useKeplrEwallet();
  const [accountInfo, setAccountInfo] = useState<{
    address: string;
    accountNumber?: number;
    sequence?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const signer = cosmosEWallet?.getOfflineSigner(TEST_CHAIN_ID);
  const aminoSigner = cosmosEWallet?.getOfflineSignerOnlyAmino(TEST_CHAIN_ID);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const key = await cosmosEWallet?.getKey(TEST_CHAIN_ID);
      const address = key?.bech32Address;

      if (!address || !key || !signer) {
        return;
      }

      const client = await SigningStargateClient.connectWithSigner(
        TEST_CHAIN_RPC,
        signer,
      );
      const account = await client.getAccount(address);

      setAccountInfo({
        address,
        accountNumber: account?.accountNumber,
        sequence: account?.sequence?.toString(),
      });
      setIsLoading(false);
    })();

    return () => {
      setAccountInfo(null);
    };
  }, [cosmosEWallet]);

  return { accountInfo, isLoading, signer, aminoSigner };
};

export const CosmosOnchainCosmJsSignWidget = () => {
  const { cosmosEWallet } = useKeplrEwallet();
  const { accountInfo, isLoading, signer, aminoSigner } =
    useGetCosmosAccountInfo();
  const [result, setResult] = useState<{
    sendTokens: {
      isSuccess: boolean;
      successTxHash?: string;
      error?: string;
    };
    signAndBroadcastAmino: {
      isSuccess: boolean;
      successTxHash?: string;
      error?: string;
    };
    signAndBroadcastDirect: {
      isSuccess: boolean;
      successTxHash?: string;
      error?: string;
    };
  }>({
    sendTokens: {
      isSuccess: false,
    },
    signAndBroadcastAmino: {
      isSuccess: false,
    },
    signAndBroadcastDirect: {
      isSuccess: false,
    },
  });

  const sendToken = async () => {
    const testGasPrice = GasPrice.fromString("0.0025uosmo");
    const testSendToken = coin("10", "uosmo");

    if (!accountInfo || !signer) {
      throw new Error("Account info or signer is not found");
    }

    const clientWithSigner = await SigningStargateClient.connectWithSigner(
      TEST_CHAIN_RPC,
      signer,
      {
        gasPrice: testGasPrice,
      },
    );

    try {
      const res = await clientWithSigner.sendTokens(
        accountInfo.address,
        accountInfo.address,
        [testSendToken],
        "auto",
      );
      setResult((prev) => ({
        ...prev,
        sendTokens: {
          isSuccess: true,
          successTxHash: res.transactionHash,
        },
      }));
    } catch (error) {
      setResult((prev) => ({
        ...prev,
        sendTokens: {
          isSuccess: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    }
  };

  const onSendTokenAmino = async () => {
    if (!cosmosEWallet || !aminoSigner) {
      throw new Error("CosmosEWallet or aminoSigner is not found");
    }

    const { address, msgs } =
      await makeMockSendTokenAminoSignDoc(cosmosEWallet);
    const testGasPrice = GasPrice.fromString("0.0025uosmo");
    const clientWithSigner = await SigningStargateClient.connectWithSigner(
      TEST_CHAIN_RPC,
      aminoSigner,
      {
        gasPrice: testGasPrice,
      },
    );

    try {
      const res = await clientWithSigner.signAndBroadcast(
        address,
        msgs.map((msg) => ({
          typeUrl: msg.type,
          value: msg.value,
        })),
        "auto",
      );
      setResult((prev) => ({
        ...prev,
        signAndBroadcastAmino: {
          isSuccess: true,
          successTxHash: res.transactionHash,
        },
      }));
    } catch (error) {
      setResult((prev) => ({
        ...prev,
        signAndBroadcastAmino: {
          isSuccess: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    }
  };

  const onSendTokenDirect = async () => {
    if (!cosmosEWallet || !signer) {
      throw new Error("CosmosEWallet or signer is not found");
    }

    const account = await cosmosEWallet.getKey(TEST_CHAIN_ID);
    const address = account?.bech32Address;

    const testGasPrice = GasPrice.fromString("0.0025uosmo");
    const clientWithSigner = await SigningStargateClient.connectWithSigner(
      TEST_CHAIN_RPC,
      signer,
      {
        gasPrice: testGasPrice,
      },
    );

    const msg = MsgSend.fromPartial({
      fromAddress: address,
      toAddress: address,
      amount: [coin("10", "uosmo")],
    });

    try {
      const res = await clientWithSigner.signAndBroadcast(
        address,
        [
          {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: msg,
          },
        ],
        "auto",
      );
      setResult((prev) => ({
        ...prev,
        signAndBroadcastDirect: {
          isSuccess: true,
          successTxHash: res.transactionHash,
        },
      }));
    } catch (error) {
      setResult((prev) => ({
        ...prev,
        signAndBroadcastDirect: {
          isSuccess: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    }
  };

  return (
    <div>
      {isLoading ? (
        <h3>cosmjs sign widget setup...</h3>
      ) : (
        accountInfo && (
          <div className={styles.container}>
            <p>Address: {accountInfo.address}</p>

            <ActionButton
              label="sendTokens"
              onClick={sendToken}
              result={result.sendTokens}
              actionName="sendTokens"
            />

            <ActionButton
              label="signAndBroadcast (amino)"
              onClick={onSendTokenAmino}
              result={result.signAndBroadcastAmino}
              actionName="signAndBroadcastAmino"
            />

            <ActionButton
              label="signAndBroadcast (direct)"
              onClick={onSendTokenDirect}
              result={result.signAndBroadcastDirect}
              actionName="signAndBroadcastDirect"
            />
          </div>
        )
      )}
    </div>
  );
};

interface ActionResult {
  isSuccess: boolean;
  successTxHash?: string;
  error?: string;
}
interface ActionButtonProps {
  label: string;
  onClick: () => Promise<void>;
  result: ActionResult;
  actionName: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  result,
  actionName,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.actionButtonContainer}>
      <button
        className={styles.sendTxButton}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? `${label} loading...` : label}
      </button>
      <div className={styles.resultContainer}>
        {result.isSuccess && !isLoading ? (
          <p className={styles.success}>
            {actionName} success
            {result.successTxHash && <span> - Tx: {result.successTxHash}</span>}
          </p>
        ) : (
          result.error &&
          !isLoading && (
            <p className={styles.error}>
              {actionName} error: {result.error}
            </p>
          )
        )}
      </div>
    </div>
  );
};
