import type { AminoMsg } from "@cosmjs/amino";
import { ChainIdHelper } from "@keplr-wallet/cosmos";
import type { MsgSend } from "@keplr-wallet/proto-types/cosmos/bank/v1beta1/tx";
import type { MsgDelegate } from "@keplr-wallet/proto-types/cosmos/staking/v1beta1/tx";
import type { MsgTransfer } from "@keplr-wallet/proto-types/ibc/applications/transfer/v1/tx";
import type { ChainInfo, Currency, Msg } from "@keplr-wallet/types";
import { CoinPretty } from "@keplr-wallet/unit";

import type { AssetMetaParams } from "@oko-wallet-attached/types/asset_meta";
import type { UnpackedMsgForView } from "@oko-wallet-attached/types/cosmos_msg";

export async function computeAmountInMsgs({
  disableBalanceCheck,
  msgs,
  chainInfo,
  signer,
  findOrUpdateAssetMeta,
}: {
  disableBalanceCheck: boolean;
  msgs: readonly Msg[] | UnpackedMsgForView[];
  chainInfo: ChainInfo;
  signer: string;
  findOrUpdateAssetMeta: (params: AssetMetaParams) => Promise<Currency[]>;
}): Promise<CoinPretty[]> {
  if (disableBalanceCheck || chainInfo.feeCurrencies?.length === 0) {
    return [];
  }

  if (msgs.length === 0) {
    return [];
  }

  if ("unpacked" in msgs[0]) {
    return await computeAmountInProtoMsgs(
      msgs as UnpackedMsgForView[],
      signer,
      findOrUpdateAssetMeta,
      chainInfo,
    );
  } else {
    return await computeAmountInAminoMsgs(
      msgs as readonly AminoMsg[],
      signer,
      findOrUpdateAssetMeta,
      chainInfo,
    );
  }
}

async function computeAmountInAminoMsgs(
  msgs: readonly AminoMsg[],
  signer: string,
  findOrUpdateAssetMeta: (params: AssetMetaParams) => Promise<Currency[]>,
  chainInfo: ChainInfo,
): Promise<CoinPretty[]> {
  const chainIdentifier = ChainIdHelper.parse(chainInfo.chainId).identifier;
  const amountPromises: Promise<CoinPretty | null>[] = [];
  for (const msg of msgs) {
    try {
      // TODO: msg.type이 다른 체인들이 몇개 있다. 이런 얘들에 대해서 좀 더 편리하게 처리해줄 방법을 찾아본다.
      //       이 기능이 사용자의 자산을 잃게 만들리는 없기 때문에 나중에 처리해준다.
      switch (msg.type) {
        case "cosmos-sdk/MsgSend":
          if (msg.value.from_address && msg.value.from_address === signer) {
            if (msg.value.amount && Array.isArray(msg.value.amount)) {
              for (const amountInMsg of msg.value.amount) {
                amountPromises.push(
                  findOrUpdateAssetMeta({
                    assets: [
                      {
                        chain_identifier: chainIdentifier,
                        minimal_denom: amountInMsg.denom,
                      },
                    ],
                  })
                    .then((assetMeta) => {
                      if (assetMeta.length > 0) {
                        return new CoinPretty(assetMeta[0], amountInMsg.amount);
                      }
                      return null;
                    })
                    .catch(() => {
                      return null;
                    }),
                );
              }
            }
          }
          break;
        case "cosmos-sdk/MsgDelegate":
          if (
            msg.value.delegator_address &&
            msg.value.delegator_address === signer
          ) {
            if (msg.value.amount?.amount && msg.value.amount.denom) {
              amountPromises.push(
                findOrUpdateAssetMeta({
                  assets: [
                    {
                      chain_identifier: chainIdentifier,
                      minimal_denom: msg.value.amount.denom,
                    },
                  ],
                })
                  .then((assetMeta) => {
                    if (assetMeta.length > 0) {
                      return new CoinPretty(
                        assetMeta[0],
                        msg.value.amount.amount,
                      );
                    }
                    return null;
                  })
                  .catch(() => {
                    return null;
                  }),
              );
            }
          }
          break;
        case "cosmos-sdk/MsgTransfer": {
          if (msg.value.sender && msg.value.sender === signer) {
            if (msg.value.token?.amount && msg.value.token.denom) {
              amountPromises.push(
                findOrUpdateAssetMeta({
                  assets: [
                    {
                      chain_identifier: chainIdentifier,
                      minimal_denom: msg.value.token.denom,
                    },
                  ],
                })
                  .then((assetMeta) => {
                    if (assetMeta.length > 0) {
                      return new CoinPretty(
                        assetMeta[0],
                        msg.value.token.amount,
                      );
                    }
                    return null;
                  })
                  .catch(() => {
                    return null;
                  }),
              );
            }
          }
          break;
        }
      }
    } catch (e: any) {
      console.log(`Error on the parsing the msg: ${e.message || e.toString()}`);
    }
  }
  const results = await Promise.allSettled(amountPromises);
  const amount: CoinPretty[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== null) {
      amount.push(result.value);
    }
  }
  return mergeDuplicatedAmount(amount);
}

async function computeAmountInProtoMsgs(
  msgs: UnpackedMsgForView[],
  signer: string,
  findOrUpdateAssetMeta: (params: AssetMetaParams) => Promise<Currency[]>,
  chainInfo: ChainInfo,
): Promise<CoinPretty[]> {
  const chainIdentifier = ChainIdHelper.parse(chainInfo.chainId).identifier;
  const amountPromises: Promise<CoinPretty | null>[] = [];
  for (const msg of msgs) {
    try {
      switch (msg.typeUrl) {
        case "/cosmos.bank.v1beta1.MsgSend": {
          const sendMsg = msg.unpacked as MsgSend;
          if (sendMsg && sendMsg.fromAddress.toString() === signer) {
            for (const amountInMsg of sendMsg.amount) {
              amountPromises.push(
                findOrUpdateAssetMeta({
                  assets: [
                    {
                      chain_identifier: chainIdentifier,
                      minimal_denom: amountInMsg.denom,
                    },
                  ],
                })
                  .then((assetMeta) => {
                    if (assetMeta.length > 0) {
                      return new CoinPretty(assetMeta[0], amountInMsg.amount);
                    }
                    return null;
                  })
                  .catch(() => {
                    return null;
                  }),
              );
            }
          }
          break;
        }
        case "/cosmos.staking.v1beta1.MsgDelegate": {
          const delegateMsg = msg.unpacked as MsgDelegate;
          if (
            delegateMsg.delegatorAddress &&
            delegateMsg.delegatorAddress === signer
          ) {
            if (delegateMsg.amount) {
              const amountValue = delegateMsg.amount.amount;
              const denom = delegateMsg.amount.denom;
              amountPromises.push(
                findOrUpdateAssetMeta({
                  assets: [
                    {
                      chain_identifier: chainIdentifier,
                      minimal_denom: denom,
                    },
                  ],
                })
                  .then((assetMeta) => {
                    if (assetMeta.length > 0) {
                      return new CoinPretty(assetMeta[0], amountValue);
                    }
                    return null;
                  })
                  .catch(() => {
                    return null;
                  }),
              );
            }
          }
          break;
        }
        case "/ibc.applications.transfer.v1.MsgTransfer": {
          const ibcTransferMsg = msg.unpacked as MsgTransfer;
          if (ibcTransferMsg.sender && ibcTransferMsg.sender === signer) {
            if (ibcTransferMsg.token) {
              amountPromises.push(
                findOrUpdateAssetMeta({
                  assets: [
                    {
                      chain_identifier: chainIdentifier,
                      minimal_denom: ibcTransferMsg.token.denom,
                    },
                  ],
                })
                  .then((assetMeta) => {
                    if (assetMeta.length > 0) {
                      return new CoinPretty(
                        assetMeta[0],
                        ibcTransferMsg.token?.amount ?? "0",
                      );
                    }

                    return null;
                  })
                  .catch(() => {
                    return null;
                  }),
              );
            }
          }
          break;
        }
      }
    } catch (e: any) {
      console.log(`Error on the parsing the msg: ${e.message || e.toString()}`);
    }
  }
  const results = await Promise.allSettled(amountPromises);
  const amount: CoinPretty[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== null) {
      amount.push(result.value);
    }
  }
  return mergeDuplicatedAmount(amount);
}

function mergeDuplicatedAmount(amount: CoinPretty[]): CoinPretty[] {
  const mergedMap = new Map<string, CoinPretty>();

  for (const amt of amount) {
    let merged = mergedMap.get(amt.currency.coinMinimalDenom);
    if (!merged) {
      merged = amt;
      mergedMap.set(amt.currency.coinMinimalDenom, merged);
    } else {
      merged = merged.add(amt);
      mergedMap.set(amt.currency.coinMinimalDenom, merged);
    }
  }

  return Array.from(mergedMap.values());
}
