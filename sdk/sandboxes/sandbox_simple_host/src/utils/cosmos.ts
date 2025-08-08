import { makeSignDoc as makeProtoSignDoc } from "@cosmjs/proto-signing";
import {
  AuthInfo,
  Fee,
  TxBody,
} from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import { MsgSend } from "@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx";
import { PubKey } from "@keplr-wallet/proto-types/cosmos/crypto/secp256k1/keys";
import { SignMode } from "@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing";
import { SigningStargateClient } from "@cosmjs/stargate";
import { SignDocWrapper } from "@keplr-wallet/cosmos";
import type { Coin } from "@keplr-wallet/proto-types/cosmos/base/v1beta1/coin";
import type { CosmosEWallet } from "@keplr-ewallet/ewallet-sdk-cosmos";
import { makeSignDoc as makeAminoSignDoc } from "@cosmjs/amino";

import { TEST_COSMOS_CHAIN_ID, TEST_COSMOS_CHAIN_RPC } from "@/constants";

export async function makeMockSendTokenProtoSignDoc(
  cosmosEWallet: CosmosEWallet,
  coin: Coin = {
    denom: "uosmo",
    amount: "10",
  },
) {
  const account = await cosmosEWallet.getKey(TEST_COSMOS_CHAIN_ID);
  const stargateClient = await SigningStargateClient.connect(
    TEST_COSMOS_CHAIN_RPC,
  );
  const accountInfo = await stargateClient.getAccount(account?.bech32Address);

  const address = account?.bech32Address;
  const sequence = accountInfo?.sequence?.toString();
  const accountNumber = accountInfo?.accountNumber;

  if (!address) {
    throw new Error("Address is not found");
  }

  if (!accountNumber || !sequence) {
    throw new Error(
      `${account?.bech32Address} accountNumber or sequence is not found please Send some tokens to this address`,
    );
  }

  const bodyBytes = TxBody.encode(
    TxBody.fromPartial<{}>({
      messages: [
        {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: MsgSend.encode({
            fromAddress: address,
            toAddress: address,
            amount: [coin],
          }).finish(),
        },
      ],
      memo: "",
    }),
  ).finish();

  const authInfoBytes = AuthInfo.encode({
    signerInfos: [
      {
        publicKey: {
          typeUrl: "/cosmos.crypto.secp256k1.PubKey",
          value: PubKey.encode({
            key: account.pubKey,
          }).finish(),
        },
        modeInfo: {
          single: {
            mode: SignMode.SIGN_MODE_DIRECT,
          },
          multi: undefined,
        },
        sequence: sequence ?? "0",
      },
    ],
    fee: Fee.fromPartial<{}>({
      amount: [
        {
          denom: "uosmo",
          amount: "1000",
        },
      ],
      gas: "200000",
      gasLimit: "200000",
    }),
  }).finish();

  const mockSignDoc = makeProtoSignDoc(
    bodyBytes,
    authInfoBytes,
    TEST_COSMOS_CHAIN_ID,
    accountNumber,
  );

  const signDocWrapper = SignDocWrapper.fromDirectSignDoc({
    ...mockSignDoc,
    accountNumber: accountNumber.toString(),
  });

  return {
    accountNumber,
    sequence,
    address,
    mockSignDoc,
    msgs: signDocWrapper.protoSignDoc.txMsgs,
  };
}

export async function makeMockSendTokenAminoSignDoc(
  cosmosEWallet: CosmosEWallet,
  coin: Coin = {
    denom: "uosmo",
    amount: "10",
  },
) {
  const account = await cosmosEWallet.getKey(TEST_COSMOS_CHAIN_ID);
  const stargateClient = await SigningStargateClient.connect(
    TEST_COSMOS_CHAIN_RPC,
  );
  const accountInfo = await stargateClient.getAccount(account?.bech32Address);

  const address = account?.bech32Address;
  const sequence = accountInfo?.sequence?.toString();
  const accountNumber = accountInfo?.accountNumber?.toString();

  if (!address || !sequence || !accountNumber) {
    throw new Error("Address or sequence or accountNumber is not found");
  }

  const stdFee = {
    amount: [
      {
        denom: "uosmo",
        amount: "1000",
      },
    ],
    gas: "200000",
  };
  const memo = "";
  const msgs = [
    {
      type: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress: address,
        toAddress: address,
        amount: [
          {
            denom: "uosmo",
            amount: "10",
          },
        ],
      },
    },
  ];

  const mockSignDoc = makeAminoSignDoc(
    msgs,
    stdFee,
    TEST_COSMOS_CHAIN_ID,
    memo,
    accountNumber,
    sequence,
  );

  return {
    mockSignDoc,
    accountNumber,
    sequence,
    address,
    msgs,
  };
}
