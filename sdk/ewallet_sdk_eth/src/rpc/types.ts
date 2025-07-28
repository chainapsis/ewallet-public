import type {
  Hex,
  Address,
  BlockTag,
  Hash,
  Quantity,
  RpcFeeHistory,
  RpcLog,
  RpcProof,
  RpcBlock,
  RpcBlockNumber,
  RpcBlockIdentifier,
  RpcTransactionReceipt,
  RpcTransactionRequest,
  RpcTransaction,
  RpcStateOverride,
  ExactPartial,
  LogTopic,
  RpcUncle,
  NetworkSync,
  AddEthereumChainParameter,
  TypedDataDefinition,
} from "viem";

import type { ErrorObject } from "@keplr-ewallet-sdk-eth/errors";

export type RpcResponse<
  result = RpcResponseData<RpcMethod>,
  error extends ErrorObject<unknown> = ErrorObject<unknown>,
> = {
  id: number;
  jsonrpc: "2.0";
} & ({ result: result } | { error: error });

export class RpcError extends Error {
  public readonly code: number;
  public readonly data?: unknown;

  constructor(errorObject: ErrorObject<unknown>) {
    super(errorObject.message);
    this.code = errorObject.code;
    this.data = errorObject.data;
  }

  toErrorObject(): ErrorObject<unknown> {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}

export namespace RpcResponse {
  export function isSuccess<T>(
    response: RpcResponse<T>,
  ): response is { id: number; jsonrpc: "2.0" } & { result: T } {
    return "result" in response;
  }

  export function isError<T>(response: RpcResponse<T>): response is {
    id: number;
    jsonrpc: "2.0";
  } & {
    error: ErrorObject<unknown>;
  } {
    return "error" in response;
  }

  export function getResult<T>(response: RpcResponse<T>): T {
    if (isSuccess(response)) {
      return response.result;
    }
    throw new RpcError(response.error);
  }

  export function getResultOrNull<T>(response: RpcResponse<T>): T | null {
    return isSuccess(response) ? response.result : null;
  }

  export function getError<T>(
    response: RpcResponse<T>,
  ): ErrorObject<unknown> | null {
    return isError(response) ? response.error : null;
  }
}

export type RpcBlockRef = RpcBlockNumber | BlockTag | RpcBlockIdentifier;

type Web3ClientVersion = {
  Req: {
    method: "web3_clientVersion";
    params?: undefined;
  };
  Res: string;
};

type EthAccounts = {
  Req: { method: "eth_accounts"; params?: undefined };
  Res: Address[];
};

type EthChainId = {
  Req: { method: "eth_chainId"; params?: undefined };
  Res: Quantity;
};

type EthBlockNumber = {
  Req: { method: "eth_blockNumber"; params?: undefined };
  Res: Quantity;
};

type EthGetBalance = {
  Req: {
    method: "eth_getBalance";
    params: [address: Address, block: RpcBlockRef];
  };
  Res: Quantity;
};

type EthCall = {
  Req: {
    method: "eth_call";
    params:
      | [transaction: ExactPartial<RpcTransactionRequest>]
      | [transaction: ExactPartial<RpcTransactionRequest>, block: RpcBlockRef]
      | [
          transaction: ExactPartial<RpcTransactionRequest>,
          block: RpcBlockRef,
          stateOverrides: RpcStateOverride,
        ];
  };
  Res: Hex;
};

type EthBlobBaseFee = {
  Req: {
    method: "eth_blobBaseFee";
    params?: undefined;
  };
  Res: Quantity;
};

type EthCoinbase = {
  Req: {
    method: "eth_coinbase";
    params?: undefined;
  };
  Res: Address;
};

type EthEstimateGas = {
  Req: {
    method: "eth_estimateGas";
    params:
      | [transaction: RpcTransactionRequest]
      | [
          transaction: RpcTransactionRequest,
          block: Exclude<RpcBlockRef, RpcBlockIdentifier>,
        ]
      | [
          transaction: RpcTransactionRequest,
          block: Exclude<RpcBlockRef, RpcBlockIdentifier>,
          stateOverrides: RpcStateOverride,
        ];
  };
  Res: Quantity;
};

type EthFeeHistory = {
  Req: {
    method: "eth_feeHistory";
    params: [
      blockCount: Quantity,
      newestBlock: Exclude<RpcBlockRef, RpcBlockIdentifier>,
      rewardPercentiles: number[] | undefined,
    ];
  };
  Res: RpcFeeHistory;
};

type EthGasPrice = {
  Req: {
    method: "eth_gasPrice";
    params?: undefined;
  };
  Res: Quantity;
};

type EthGetBlockByHash = {
  Req: {
    method: "eth_getBlockByHash";
    params: [hash: Hash, includeTransactionObjects: boolean];
  };
  Res: RpcBlock | null;
};

type EthGetBlockByNumber = {
  Req: {
    method: "eth_getBlockByNumber";
    params: [
      block: Exclude<RpcBlockRef, RpcBlockIdentifier>,
      includeTransactionObjects: boolean,
    ];
  };
  Res: RpcBlock | null;
};

type EthGetBlockTransactionCountByHash = {
  Req: {
    method: "eth_getBlockTransactionCountByHash";
    params: [hash: Hash];
  };
  Res: Quantity;
};

type EthGetBlockTransactionCountByNumber = {
  Req: {
    method: "eth_getBlockTransactionCountByNumber";
    params: [block: Exclude<RpcBlockRef, RpcBlockIdentifier>];
  };
  Res: Quantity;
};

type EthGetCode = {
  Req: {
    method: "eth_getCode";
    params: [address: Address, block: RpcBlockRef];
  };
  Res: Hex;
};

type EthGetProof = {
  Req: {
    method: "eth_getProof";
    params: [
      address: Address,
      storageKeys: Hash[],
      block: Exclude<RpcBlockRef, RpcBlockIdentifier>,
    ];
  };
  Res: RpcProof;
};

type EthGetStorageAt = {
  Req: {
    method: "eth_getStorageAt";
    params: [address: Address, index: Quantity, block: RpcBlockRef];
  };
  Res: Hex;
};

type EthGetTransactionByBlockHashAndIndex = {
  Req: {
    method: "eth_getTransactionByBlockHashAndIndex";
    params: [hash: Hash, index: Quantity];
  };
  Res: RpcTransaction | null;
};

type EthGetTransactionByBlockNumberAndIndex = {
  Req: {
    method: "eth_getTransactionByBlockNumberAndIndex";
    params: [block: Exclude<RpcBlockRef, RpcBlockIdentifier>, index: Quantity];
  };
  Res: RpcTransaction | null;
};

type EthGetTransactionByHash = {
  Req: {
    method: "eth_getTransactionByHash";
    params: [hash: Hash];
  };
  Res: RpcTransaction | null;
};

type EthGetTransactionCount = {
  Req: {
    method: "eth_getTransactionCount";
    params: [address: Address, block: RpcBlockRef];
  };
  Res: Quantity;
};

type EthGetTransactionReceipt = {
  Req: {
    method: "eth_getTransactionReceipt";
    params: [hash: Hash];
  };
  Res: RpcTransactionReceipt | null;
};

type EthGetUncleByBlockHashAndIndex = {
  Req: {
    method: "eth_getUncleByBlockHashAndIndex";
    params: [hash: Hash, index: Quantity];
  };
  Res: RpcUncle | null;
};

type EthGetUncleByBlockNumberAndIndex = {
  Req: {
    method: "eth_getUncleByBlockNumberAndIndex";
    params: [block: Exclude<RpcBlockRef, RpcBlockIdentifier>, index: Quantity];
  };
  Res: RpcUncle | null;
};

type EthGetUncleCountByBlockHash = {
  Req: {
    method: "eth_getUncleCountByBlockHash";
    params: [hash: Hash];
  };
  Res: Quantity;
};

type EthGetUncleCountByBlockNumber = {
  Req: {
    method: "eth_getUncleCountByBlockNumber";
    params: [block: Exclude<RpcBlockRef, RpcBlockIdentifier>];
  };
  Res: Quantity;
};

type EthMaxPriorityFeePerGas = {
  Req: {
    method: "eth_maxPriorityFeePerGas";
    params?: undefined;
  };
  Res: Quantity;
};

type EthRequestAccounts = {
  Req: {
    method: "eth_requestAccounts";
    params?: undefined;
  };
  Res: readonly Address[];
};

type EthSendRawTransaction = {
  Req: {
    method: "eth_sendRawTransaction";
    params: [serializedTransaction: Hex];
  };
  Res: Hash;
};

type EthSendTransaction = {
  Req: {
    method: "eth_sendTransaction";
    params: [transaction: RpcTransactionRequest];
  };
  Res: Hex;
};

type EthSignTransaction = {
  Req: {
    method: "eth_signTransaction";
    params: [request: RpcTransactionRequest];
  };
  Res: Hex;
};

type EthSignTypedDataV4 = {
  Req: {
    method: "eth_signTypedData_v4";
    params: [address: Address, message: TypedDataDefinition];
  };
  Res: Hex;
};

type EthGetFilterChanges = {
  Req: {
    method: "eth_getFilterChanges";
    params: [filterId: Quantity];
  };
  Res: RpcLog[] | Hex[];
};

type EthGetFilterLogs = {
  Req: {
    method: "eth_getFilterLogs";
    params: [filterId: Quantity];
  };
  Res: RpcLog[];
};

type EthGetLogs = {
  Req: {
    method: "eth_getLogs";
    params: {
      address?: Address | Address[] | undefined;
      topics?: LogTopic[] | undefined;
    } & (
      | {
          fromBlock?: Exclude<RpcBlockRef, RpcBlockIdentifier> | undefined;
          toBlock?: Exclude<RpcBlockRef, RpcBlockIdentifier> | undefined;
          blockHash?: undefined;
        }
      | {
          fromBlock?: undefined;
          toBlock?: undefined;
          blockHash?: Hash | undefined;
        }
    );
  };
  Res: RpcLog[];
};

type EthNewBlockFilter = {
  Req: {
    method: "eth_newBlockFilter";
    params?: undefined;
  };
  Res: Quantity;
};

type EthNewFilter = {
  Req: {
    method: "eth_newFilter";
    params: [
      filter: {
        fromBlock?: Exclude<RpcBlockRef, RpcBlockIdentifier> | undefined;
        toBlock?: Exclude<RpcBlockRef, RpcBlockIdentifier> | undefined;
        address?: Address | Address[] | undefined;
        topics?: LogTopic[] | undefined;
      },
    ];
  };
  Res: Quantity;
};

type EthNewPendingTransactionFilter = {
  Req: {
    method: "eth_newPendingTransactionFilter";
    params?: undefined;
  };
  Res: Quantity;
};

type EthUninstallFilter = {
  Req: {
    method: "eth_uninstallFilter";
    params: [filterId: Quantity];
  };
  Res: boolean;
};

type EthProtocolVersion = {
  Req: {
    method: "eth_protocolVersion";
    params?: undefined;
  };
  Res: string;
};

type EthSyncing = {
  Req: {
    method: "eth_syncing";
    params?: undefined;
  };
  Res: NetworkSync | false;
};

type EthPersonalSign = {
  Req: {
    method: "eth_personalSign";
    params: [address: Address, data: Hex];
  };
  Res: Hex;
};

type WalletAddEthereumChain = {
  Req: {
    method: "wallet_addEthereumChain";
    params: [chain: AddEthereumChainParameter];
  };
  Res: null;
};

type WalletSwitchEthereumChain = {
  Req: {
    method: "wallet_switchEthereumChain";
    params: [chain: { chainId: string }];
  };
  Res: null;
};

export interface PublicRpcMethodMap {
  web3_clientVersion: Web3ClientVersion;
  eth_blobBaseFee: EthBlobBaseFee;
  eth_blockNumber: EthBlockNumber;
  eth_chainId: EthChainId;
  eth_call: EthCall;
  eth_coinbase: EthCoinbase;
  eth_feeHistory: EthFeeHistory;
  eth_estimateGas: EthEstimateGas;
  eth_gasPrice: EthGasPrice;
  eth_getBalance: EthGetBalance;
  eth_getBlockByHash: EthGetBlockByHash;
  eth_getBlockByNumber: EthGetBlockByNumber;
  eth_getBlockTransactionCountByHash: EthGetBlockTransactionCountByHash;
  eth_getBlockTransactionCountByNumber: EthGetBlockTransactionCountByNumber;
  eth_getCode: EthGetCode;
  eth_getProof: EthGetProof;
  eth_getFilterChanges: EthGetFilterChanges;
  eth_getFilterLogs: EthGetFilterLogs;
  eth_getLogs: EthGetLogs;
  eth_newBlockFilter: EthNewBlockFilter;
  eth_newFilter: EthNewFilter;
  eth_newPendingTransactionFilter: EthNewPendingTransactionFilter;
  eth_uninstallFilter: EthUninstallFilter;
  eth_getStorageAt: EthGetStorageAt;
  eth_getTransactionByBlockHashAndIndex: EthGetTransactionByBlockHashAndIndex;
  eth_getTransactionByBlockNumberAndIndex: EthGetTransactionByBlockNumberAndIndex;
  eth_getTransactionByHash: EthGetTransactionByHash;
  eth_getTransactionCount: EthGetTransactionCount;
  eth_getTransactionReceipt: EthGetTransactionReceipt;
  eth_getUncleByBlockHashAndIndex: EthGetUncleByBlockHashAndIndex;
  eth_getUncleByBlockNumberAndIndex: EthGetUncleByBlockNumberAndIndex;
  eth_getUncleCountByBlockHash: EthGetUncleCountByBlockHash;
  eth_getUncleCountByBlockNumber: EthGetUncleCountByBlockNumber;
  eth_maxPriorityFeePerGas: EthMaxPriorityFeePerGas;
  eth_protocolVersion: EthProtocolVersion;
  eth_sendRawTransaction: EthSendRawTransaction;
  eth_syncing: EthSyncing;
}

export interface WalletRpcMethodMap {
  eth_accounts: EthAccounts;
  eth_requestAccounts: EthRequestAccounts;
  eth_sendTransaction: EthSendTransaction;
  eth_signTransaction: EthSignTransaction;
  eth_signTypedData_v4: EthSignTypedDataV4;
  personal_sign: EthPersonalSign;
  wallet_addEthereumChain: WalletAddEthereumChain;
  wallet_switchEthereumChain: WalletSwitchEthereumChain;
}

export interface RpcMethodMap extends PublicRpcMethodMap, WalletRpcMethodMap {}

export type PublicRpcMethod = keyof PublicRpcMethodMap;
export type WalletRpcMethod = keyof WalletRpcMethodMap;

export type RpcMethod = PublicRpcMethod | WalletRpcMethod;

export type UnsupportedPublicRpcMethod = Exclude<
  string,
  keyof PublicRpcMethodMap
>;
export type UnsupportedWalletRpcMethod = Exclude<
  string,
  keyof WalletRpcMethodMap
>;

export type UnsupportedRpcMethod =
  | UnsupportedPublicRpcMethod
  | UnsupportedWalletRpcMethod;

export type RpcRequestArgs<M extends RpcMethod> =
  RpcMethodMap[M]["Req"]["params"] extends undefined
    ? {
        method: M;
        params?: undefined;
      }
    : {
        method: M;
        params: RpcMethodMap[M]["Req"]["params"];
      };

export type RpcResponseData<M extends RpcMethod> = RpcMethodMap[M]["Res"];
