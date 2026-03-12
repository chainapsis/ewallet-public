import { Buffer } from "buffer";

import type { OkoCosmosWalletInterface } from "@oko-wallet-sdk-cosmos/types";
import { simpleFetch } from "@oko-wallet-sdk-cosmos/utils";

export async function sendTx(
  this: OkoCosmosWalletInterface,
  chainId: string,
  tx: unknown,
  mode: "async" | "sync" | "block",
): Promise<Uint8Array> {
  const chainInfoList = await this.getCosmosChainInfo();
  const chainInfo = chainInfoList.find((info) => info.chainId === chainId);

  if (!chainInfo) {
    throw new Error(`Chain info not found for chainId: ${chainId}`);
  }

  const isProtoTx = Buffer.isBuffer(tx) || tx instanceof Uint8Array;

  let _mode: string;
  switch (mode) {
    case "async":
      _mode = "BROADCAST_MODE_ASYNC";
      break;
    case "block":
      _mode = "BROADCAST_MODE_BLOCK";
      break;
    case "sync":
      _mode = "BROADCAST_MODE_SYNC";
      break;
    default:
      _mode = "BROADCAST_MODE_UNSPECIFIED";
  }

  const params = {
    tx_bytes: Buffer.from(tx as any).toString("base64"),
    mode: _mode,
  };

  try {
    const result = await simpleFetch<any>(
      chainInfo.rest,
      "/cosmos/tx/v1beta1/txs",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(params),
      },
    );

    const txResponse = isProtoTx ? result.data.tx_response : result.data;

    if (txResponse.code != null && txResponse.code !== 0) {
      throw new Error(txResponse.raw_log);
    }

    const txHash = Buffer.from(txResponse.txhash, "hex");

    return txHash;
  } catch (err: any) {
    console.error("Error sending tx, err: %s", err.toString());

    throw err;
  }
}
