import { toHex } from "viem";

import type { EthSigner } from "@keplr-ewallet-sdk-eth/types";

// Mock signer for testing wallet methods
export function createMockSigner(): EthSigner {
  return {
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as const, // vitalik.eth
    sign: async () =>
      Promise.resolve({
        type: "signature",
        signature: "0x123456789abcdef" as `0x${string}`,
      }),
  };
}

export interface MockRpcResponse {
  id?: string | number;
  jsonrpc?: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MockRpcServerConfig {
  chainId?: string;
  shouldFail?: boolean;
  customResponse?: MockRpcResponse;
  delay?: number;
}

/**
 * Mock RPC Server for testing
 * Uses Jest's fetch mock to simulate RPC responses
 */
export class MockRpcServer {
  private originalFetch: typeof global.fetch;
  private mockConfigs: Map<string, MockRpcServerConfig> = new Map();

  constructor() {
    this.originalFetch = global.fetch;
  }

  /**
   * Setup mock RPC server with configuration
   */
  setup(configs: Record<string, MockRpcServerConfig> = {}) {
    // Store configs for different RPC URLs
    Object.entries(configs).forEach(([url, config]) => {
      this.mockConfigs.set(url, config);
    });

    // Mock global fetch
    // NOTE: In your test file, use jest.spyOn(global, 'fetch') or jest.fn() as needed.
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof URL ? input.toString() : input.toString();
      const config = this.mockConfigs.get(url) || {};

      // Add delay if specified
      if (config.delay) {
        await new Promise((resolve) => setTimeout(resolve, config.delay));
      }

      // Handle failure scenarios
      if (config.shouldFail) {
        // Simulate real fetch failure with TypeError (same as actual network failures)
        const error = new TypeError(`Failed to fetch`);
        error.message = `Failed to fetch from ${url}`;
        throw error;
      }

      let body: any;
      try {
        body = init?.body ? JSON.parse(init.body as string) : {};
      } catch {
        body = {};
      }

      // Handle custom response
      if (config.customResponse) {
        return new Response(JSON.stringify(config.customResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Default RPC response based on method
      const response = this.createRpcResponse(body, config);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
  }

  /**
   * Create appropriate RPC response based on method and config
   */
  private createRpcResponse(
    body: any,
    config: MockRpcServerConfig,
  ): MockRpcResponse {
    const { method, id = 1 } = body;
    const chainId = config.chainId || "0x1"; // Default to mainnet

    switch (method) {
      case "eth_chainId":
        return {
          id,
          jsonrpc: "2.0",
          result: chainId,
        };

      case "eth_blockNumber":
        return {
          id,
          jsonrpc: "2.0",
          result: "0x123456", // Mock block number
        };

      case "eth_gasPrice":
        return {
          id,
          jsonrpc: "2.0",
          result: "0x9502f9000", // Mock gas price
        };

      case "eth_getBalance":
        return {
          id,
          jsonrpc: "2.0",
          result: "0xde0b6b3a7640000", // 1 ETH in wei
        };

      default:
        return {
          id,
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method ${method} not found`,
          },
        };
    }
  }

  /**
   * Add or update configuration for a specific URL
   */
  addConfig(url: string, config: MockRpcServerConfig) {
    this.mockConfigs.set(url, config);
  }

  /**
   * Simulate network failure for specific URL
   */
  simulateFailure(url: string) {
    this.addConfig(url, { shouldFail: true });
  }

  /**
   * Simulate chainId mismatch (RPC returns different chainId than expected)
   */
  simulateChainIdMismatch(url: string, actualChainId: string) {
    this.addConfig(url, { chainId: actualChainId });
  }

  /**
   * Simulate RPC error response
   */
  simulateRpcError(url: string, errorCode: number, errorMessage: string) {
    this.addConfig(url, {
      customResponse: {
        id: 1,
        jsonrpc: "2.0",
        error: {
          code: errorCode,
          message: errorMessage,
        },
      },
    });
  }

  /**
   * Restore original fetch
   */
  restore() {
    global.fetch = this.originalFetch;
    this.mockConfigs.clear();
  }

  /**
   * Clear all configurations but keep mock active
   */
  clear() {
    this.mockConfigs.clear();
  }
}

// Convenience functions for common scenarios
export const createMockRpcServer = () => new MockRpcServer();

export const mockMainnetRpc = (
  url: string = "https://mock-mainnet.example.com",
) => ({
  url,
  config: { chainId: toHex(1) } as MockRpcServerConfig,
});

export const mockSepoliaRpc = (
  url: string = "https://mock-sepolia.example.com",
) => ({
  url,
  config: { chainId: toHex(11155111) } as MockRpcServerConfig,
});

export const mockFailingRpc = (
  url: string = "https://mock-failing.example.com",
) => ({
  url,
  config: { shouldFail: true } as MockRpcServerConfig,
});

export const mockInvalidChainRpc = (
  url: string = "https://mock-invalid.example.com",
  wrongChainId: string = "0x999",
) => ({
  url,
  config: { chainId: wrongChainId } as MockRpcServerConfig,
});
