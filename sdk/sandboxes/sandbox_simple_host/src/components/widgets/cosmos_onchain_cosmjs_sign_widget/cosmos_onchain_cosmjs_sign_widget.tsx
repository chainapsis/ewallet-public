import React from "react";
import { MsgSend } from "@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx";
import { coin } from "@cosmjs/amino";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { GasPrice, SigningStargateClient } from "@cosmjs/stargate";
import { makeMockSendTokenAminoSignDoc } from "@/utils/cosmos";
import styles from "./cosmos_onchain_cosmjs_sign_widget.module.scss";
import { useKeplrEwallet } from "@/components/keplr_ewallet_provider/use_keplr_ewallet";

const TEST_CHAIN_ID = "osmosis-1";
const TEST_CHAIN_RPC = "https://osmosis-rpc.publicnode.com:443";

interface AccountInfo {
  address: string;
  accountNumber?: number;
}

const useGetCosmosAccountInfo = () => {
  const { cosmosEWallet } = useKeplrEwallet();
  const signer = cosmosEWallet?.getOfflineSigner(TEST_CHAIN_ID);
  const aminoSigner = cosmosEWallet?.getOfflineSignerOnlyAmino(TEST_CHAIN_ID);

  const {
    data: accountInfo,
    isLoading,
    error,
  } = useQuery<AccountInfo | null>({
    queryKey: ["cosmosAccountInfo", TEST_CHAIN_ID, cosmosEWallet],
    queryFn: async (): Promise<AccountInfo | null> => {
      if (!cosmosEWallet || !signer) {
        return null;
      }

      const key = await cosmosEWallet.getKey(TEST_CHAIN_ID);
      const address = key?.bech32Address;

      if (!address || !key) {
        return null;
      }

      const client = await SigningStargateClient.connectWithSigner(
        TEST_CHAIN_RPC,
        signer,
      );
      const account = await client.getAccount(address);

      return {
        address,
        accountNumber: account?.accountNumber,
      };
    },
    enabled: !!cosmosEWallet && !!signer,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return { accountInfo, isLoading, error, signer, aminoSigner };
};

export const CosmosOnchainCosmJsSignWidget = () => {
  const { cosmosEWallet } = useKeplrEwallet();
  const { accountInfo, isLoading, signer, aminoSigner } =
    useGetCosmosAccountInfo();

  const sendTokenMutation = useMutation({
    mutationFn: async (): Promise<string> => {
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

      const res = await clientWithSigner.sendTokens(
        accountInfo.address,
        accountInfo.address,
        [testSendToken],
        "auto",
      );

      return res.transactionHash;
    },
  });

  const sendTokenAminoMutation = useMutation({
    mutationFn: async (): Promise<string> => {
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

      const res = await clientWithSigner.signAndBroadcast(
        address,
        msgs.map((msg) => ({
          typeUrl: msg.type,
          value: msg.value,
        })),
        "auto",
      );

      return res.transactionHash;
    },
  });

  const sendTokenDirectMutation = useMutation({
    mutationFn: async (): Promise<string> => {
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

      return res.transactionHash;
    },
  });

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
              onClick={() => sendTokenMutation.mutate()}
              mutation={sendTokenMutation}
              actionName="sendTokens"
            />

            <ActionButton
              label="signAndBroadcast (amino)"
              onClick={() => sendTokenAminoMutation.mutate()}
              mutation={sendTokenAminoMutation}
              actionName="signAndBroadcastAmino"
            />

            <ActionButton
              label="signAndBroadcast (direct)"
              onClick={() => sendTokenDirectMutation.mutate()}
              mutation={sendTokenDirectMutation}
              actionName="signAndBroadcastDirect"
            />
          </div>
        )
      )}
    </div>
  );
};

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  mutation: {
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    data?: string;
    error?: Error | null;
  };
  actionName: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  mutation,
  actionName,
}) => {
  return (
    <div className={styles.actionButtonContainer}>
      <button
        className={styles.sendTxButton}
        onClick={onClick}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? `${label} loading...` : label}
      </button>
      <div className={styles.resultContainer}>
        {mutation.isSuccess && !mutation.isPending ? (
          <p className={styles.success}>
            {actionName} success
            {mutation.data && <span> - Tx: {mutation.data}</span>}
          </p>
        ) : (
          mutation.isError &&
          !mutation.isPending && (
            <p className={styles.error}>
              {actionName} error: {mutation.error?.message || "Unknown error"}
            </p>
          )
        )}
      </div>
    </div>
  );
};
