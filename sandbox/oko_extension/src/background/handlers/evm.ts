/**
 * EVM RPC Request Handler
 */

import type { ExtensionResponse, EvmRpcRequest } from "@/shared/message-types";
import { getWalletState, updateWalletState, addPendingRequest } from "../state";
import { openOkoAttached, openSignPopup } from "../oko-bridge";
import { v4 as uuidv4 } from "uuid";

// Supported EVM chains (hex chainId)
const SUPPORTED_EVM_CHAINS = new Set([
  "0x1",    // Ethereum
  "0x89",   // Polygon
  "0xa4b1", // Arbitrum
  "0xa",    // Optimism
  "0x2105", // Base
]);

// Track pending EVM RPC requests waiting for connection
const rpcRequestsWaitingForConnection = new Map<
  string,
  {
    sendResponse: (response: ExtensionResponse) => void;
    request: EvmRpcRequest;
  }
>();

/**
 * Resolve pending connection requests after wallet connects
 */
export function resolveConnectionRequests(): void {
  const state = getWalletState();
  if (!state.isConnected) return;

  for (const [reqId, { sendResponse, request }] of rpcRequestsWaitingForConnection) {
    if (request.method === "eth_requestAccounts" && state.evmAddress) {
      sendResponse({
        id: reqId,
        success: true,
        data: [state.evmAddress],
      });
      rpcRequestsWaitingForConnection.delete(reqId);
    }
  }
}

/**
 * Handle EVM RPC requests
 */
export async function handleEvmRequest(
  request: EvmRpcRequest,
  sendResponse: (response: ExtensionResponse) => void
): Promise<void> {
  const requestId = uuidv4();
  const state = getWalletState();

  console.debug("[oko-extension] EVM request:", request.method, request.params);

  switch (request.method) {
    case "eth_chainId":
      sendResponse({ id: requestId, success: true, data: state.evmChainId });
      return;

    case "web3_clientVersion":
      sendResponse({
        id: requestId,
        success: true,
        data: "OkoWallet/0.1.0",
      });
      return;

    case "eth_accounts":
      sendResponse({
        id: requestId,
        success: true,
        data: state.evmAddress ? [state.evmAddress] : [],
      });
      return;

    case "eth_requestAccounts":
      if (state.isConnected && state.evmAddress) {
        sendResponse({
          id: requestId,
          success: true,
          data: [state.evmAddress],
        });
        return;
      }

      rpcRequestsWaitingForConnection.set(requestId, { sendResponse, request });
      await openOkoAttached();
      return;

    case "personal_sign":
    case "eth_signTypedData_v4":
    case "eth_sendTransaction":
    case "eth_signTransaction": {
      if (!state.isConnected || !state.evmAddress) {
        sendResponse({
          id: requestId,
          success: false,
          error: "Wallet not connected",
        });
        return;
      }

      addPendingRequest(
        requestId,
        (result) => {
          sendResponse({
            id: requestId,
            success: true,
            data: result,
          });
        },
        (error) => {
          sendResponse({
            id: requestId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      );

      await openSignPopup(requestId, request.method, request.params);
      return;
    }

    case "wallet_switchEthereumChain": {
      const params = request.params as [{ chainId: string }] | undefined;
      const targetChainId = params?.[0]?.chainId;

      if (!targetChainId) {
        sendResponse({
          id: requestId,
          success: false,
          error: "Missing chainId parameter",
        });
        return;
      }

      if (!SUPPORTED_EVM_CHAINS.has(targetChainId)) {
        sendResponse({
          id: requestId,
          success: false,
          error: `Unrecognized chain ID "${targetChainId}". Try adding the chain using wallet_addEthereumChain first.`,
        });
        return;
      }

      updateWalletState({ evmChainId: targetChainId });
      sendResponse({ id: requestId, success: true, data: null });
      return;
    }

    case "wallet_addEthereumChain":
      // For test extension, just return success without actually adding
      sendResponse({ id: requestId, success: true, data: null });
      return;

    default:
      sendResponse({
        id: requestId,
        success: false,
        error: `Method ${request.method} not supported`,
      });
  }
}
