import { coin } from "@cosmjs/amino";
import { GasPrice, SigningStargateClient } from "@cosmjs/stargate";
import { MsgSend } from "@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { FC } from "react";

import { TEST_COSMOS_CHAIN_ID, TEST_COSMOS_CHAIN_RPC } from "@/constants";
import { useOko } from "@/hooks/use_oko";
import { useUserInfoState } from "@/state/user_info";
import { makeMockSendTokenAminoSignDoc } from "@/utils/cosmos";
import styles from "./cosmos_onchain_cosmjs_sign_widget.module.scss";

interface AccountInfo {
  address: string;
  accountNumber?: number;
}

const useGetCosmosAccountInfo = () => {
  const { okoCosmos } = useOko();
  const publicKey = useUserInfoState((state) => state.publicKey);
  const signer = okoCosmos?.getOfflineSigner(TEST_COSMOS_CHAIN_ID);
  const aminoSigner =
    okoCosmos?.getOfflineSignerOnlyAmino(TEST_COSMOS_CHAIN_ID);

  const {
    data: accountInfo,
    isLoading,
    error,
  } = useQuery<AccountInfo | null>({
    queryKey: ["cosmosAccountInfo", TEST_COSMOS_CHAIN_ID, okoCosmos, publicKey],
    queryFn: async (): Promise<AccountInfo | null> => {
      console.log("cosmosAddress !!!", publicKey);
      if (!okoCosmos || !signer) {
        return null;
      }

      const key = await okoCosmos.getKey(TEST_COSMOS_CHAIN_ID);
      const address = key?.bech32Address;

      if (!address || !key) {
        return null;
      }

      const client = await SigningStargateClient.connectWithSigner(
        TEST_COSMOS_CHAIN_RPC,
        signer,
      );
      const account = await client.getAccount(address);

      return {
        address: address,
        accountNumber: account?.accountNumber,
      };
    },
    enabled: !!okoCosmos && !!signer && !!publicKey,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return { accountInfo, isLoading, error, signer, aminoSigner };
};

export const CosmosOnchainCosmJsSignWidget = () => {
  const { okoCosmos } = useOko();
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
        TEST_COSMOS_CHAIN_RPC,
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
      if (!okoCosmos || !aminoSigner) {
        throw new Error("okoCosmos or aminoSigner is not found");
      }

      const { address, msgs } = await makeMockSendTokenAminoSignDoc(okoCosmos);
      const testGasPrice = GasPrice.fromString("0.0025uosmo");
      const clientWithSigner = await SigningStargateClient.connectWithSigner(
        TEST_COSMOS_CHAIN_RPC,
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
      if (!okoCosmos || !signer) {
        throw new Error("okoCosmos or signer is not found");
      }

      const account = await okoCosmos.getKey(TEST_COSMOS_CHAIN_ID);
      const address = account?.bech32Address;

      const testGasPrice = GasPrice.fromString("0.0025uosmo");
      const clientWithSigner = await SigningStargateClient.connectWithSigner(
        TEST_COSMOS_CHAIN_RPC,
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

const ActionButton: FC<ActionButtonProps> = ({
  label,
  onClick,
  mutation,
  actionName,
}) => {
  return (
    <div className={styles.actionButtonContainer}>
      <button
        type="button"
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
