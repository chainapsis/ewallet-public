import type { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";
import { TendermintTxTracer } from "@keplr-wallet/cosmos";
import { simpleFetch } from "@keplr-wallet/simple-fetch";
import { Buffer } from "buffer";
import { retry } from "@keplr-wallet/common";

export async function sendTx(
  this: CosmosEWallet,
  chainId: string,
  tx: unknown,
  mode: "async" | "sync" | "block",
  options: {
    silent?: boolean;
    onFulfill?: (tx: any) => void;
  } = {},
): Promise<Uint8Array> {
  const chainInfoList = await this.getCosmosChainInfo();
  const chainInfo = chainInfoList.find((info) => info.chainId === chainId);

  if (!chainInfo) {
    throw new Error(`Chain info not found for chainId: ${chainId}`);
  }

  const isProtoTx = Buffer.isBuffer(tx) || tx instanceof Uint8Array;

  const params = isProtoTx
    ? {
        tx_bytes: Buffer.from(tx as any).toString("base64"),
        mode: (() => {
          switch (mode) {
            case "async":
              return "BROADCAST_MODE_ASYNC";
            case "block":
              return "BROADCAST_MODE_BLOCK";
            case "sync":
              return "BROADCAST_MODE_SYNC";
            default:
              return "BROADCAST_MODE_UNSPECIFIED";
          }
        })(),
      }
    : {
        tx,
        mode: mode,
      };

  try {
    const result = await simpleFetch<any>(
      chainInfo.rest,
      isProtoTx ? "/cosmos/tx/v1beta1/txs" : "/txs",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(params),
      },
    );

    const txResponse = isProtoTx ? result.data["tx_response"] : result.data;

    if (txResponse.code != null && txResponse.code !== 0) {
      throw new Error(txResponse["raw_log"]);
    }

    const txHash = Buffer.from(txResponse.txhash, "hex");

    retry(
      () => {
        return new Promise<void>((resolve, reject) => {
          const txTracer = new TendermintTxTracer(chainInfo.rpc, "/websocket");
          txTracer.addEventListener("close", () => {
            setTimeout(() => {
              reject();
            }, 500);
          });
          txTracer.addEventListener("error", () => {
            reject();
          });
          txTracer.traceTx(txHash).then((tx) => {
            txTracer.close();

            if (options.onFulfill) {
              if (!tx.hash) {
                tx.hash = txHash;
              }
              options.onFulfill(tx);
            }

            resolve();
          });
        });
      },
      {
        maxRetries: 10,
        waitMsAfterError: 10 * 1000, // 10sec
        maxWaitMsAfterError: 5 * 60 * 1000, // 5min
      },
    );

    return txHash;
  } catch (e) {
    console.log(e);
    throw e;
  }
}
