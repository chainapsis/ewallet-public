/**
 * Injected Script - Runs in page context
 *
 * This script injects:
 * - window.ethereum (EIP-1193 provider for EVM dApps)
 * - wallet-standard registration (for Solana dApps)
 * - window.keplr (Keplr-compatible provider for Cosmos dApps)
 */

// Buffer polyfill for browser environment (required by SDK)
import { Buffer } from "buffer";
(window as any).Buffer = Buffer;

import { ExtensionEvmProvider } from "@/providers/evm-provider";
import { ExtensionSvmWallet } from "@/providers/svm-provider";
import { ExtensionCosmosProvider } from "@/providers/cosmos-provider";
import { OKO_ICON } from "@/shared/constants";

// EIP-6963 types
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: ExtensionEvmProvider;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: "eip6963:announceProvider";
  detail: EIP6963ProviderDetail;
}

// Avoid re-injection
if ((window as any).__OKO_INJECTED__) {
  // Already injected
} else {
  (window as any).__OKO_INJECTED__ = true;

  // ============== EVM Provider ==============
  try {
    const evmProvider = new ExtensionEvmProvider();

    // EIP-6963: Provider info
    const providerInfo: EIP6963ProviderInfo = {
      uuid: "a9e6f8a7-4b8c-4d9e-8f0a-1b2c3d4e5f6a",
      name: "Oko",
      icon: OKO_ICON,
      rdns: "app.oko",
    };

    // EIP-6963: Announce provider function
    const announceProvider = () => {
      const detail: EIP6963ProviderDetail = {
        info: providerInfo,
        provider: evmProvider,
      };

      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: Object.freeze(detail),
        }) as EIP6963AnnounceProviderEvent
      );
    };

    // EIP-6963: Listen for provider requests and announce
    window.addEventListener("eip6963:requestProvider", announceProvider);

    // EIP-6963: Announce on load
    announceProvider();

    // Inject as window.ethereum
    Object.defineProperty(window, "ethereum", {
      value: evmProvider,
      writable: false,
      configurable: true,
    });

    // Also expose as window.oko for debugging
    (window as any).oko = {
      ethereum: evmProvider,
    };

    // Dispatch initialization event
    window.dispatchEvent(new Event("ethereum#initialized"));
  } catch (error) {
    console.error("[oko-injected] Failed to inject EVM provider:", error);
  }

  // ============== Solana Wallet Standard ==============
  try {
    const svmWallet = new ExtensionSvmWallet();

    // Register with wallet-standard
    // The wallet-standard library will discover this wallet
    const registerWallet = (wallet: any) => {
      const callback = (event: any) => {
        event.detail.register(wallet);
      };
      try {
        (window as any).dispatchEvent(
          new CustomEvent("wallet-standard:register-wallet", {
            detail: { register: (w: any) => {} }, // dummy for event shape
          })
        );
      } catch {}

      window.addEventListener(
        "wallet-standard:app-ready",
        callback as EventListener
      );

      // Try immediate registration
      try {
        window.dispatchEvent(
          new CustomEvent("wallet-standard:register-wallet", {
            detail: wallet,
          })
        );
      } catch {}
    };

    // Standard wallet registration
    if (typeof window !== "undefined") {
      const wallets = ((window as any).navigator as any)?.wallets;
      if (wallets && typeof wallets.register === "function") {
        wallets.register(svmWallet);
      } else {
        // Fallback: add to a global registry
        const registry = (window as any).__WALLET_STANDARD_WALLETS__ || [];
        registry.push(svmWallet);
        (window as any).__WALLET_STANDARD_WALLETS__ = registry;

        // Also dispatch the custom event for apps listening
        window.dispatchEvent(
          new CustomEvent("wallet-standard:register-wallet", {
            detail: svmWallet,
          })
        );
      }
    }

    // Expose for debugging
    (window as any).oko = {
      ...(window as any).oko,
      solana: svmWallet,
    };

  } catch (error) {
    console.error("[oko-injected] Failed to register SVM wallet:", error);
  }

  // ============== Cosmos Provider ==============
  try {
    const cosmosProvider = new ExtensionCosmosProvider();

    // Set up Keplr SDK proxy protocol handler
    // The @keplr-wallet/provider-extension SDK uses postMessage to communicate
    window.addEventListener("message", async (event) => {
      if (event.source !== window) return;
      const data = event.data;

      // Handle Keplr SDK proxy requests
      if (data?.type === "proxy-request" && data?.method) {
        try {
          let result: unknown;

          switch (data.method) {
            case "ping":
              result = undefined;
              break;
            case "enable":
              await cosmosProvider.enable(data.args?.[0] || []);
              result = undefined;
              break;
            case "getKey":
              result = await cosmosProvider.getKey(data.args?.[0]);
              // Convert Uint8Array to array for serialization
              if (result && typeof result === "object") {
                const key = result as any;
                result = {
                  ...key,
                  pubKey: Array.from(key.pubKey || []),
                  address: Array.from(key.address || []),
                };
              }
              break;
            case "signAmino":
              result = await cosmosProvider.signAmino(
                data.args?.[0],
                data.args?.[1],
                data.args?.[2],
                data.args?.[3]
              );
              break;
            case "signDirect":
              result = await cosmosProvider.signDirect(
                data.args?.[0],
                data.args?.[1],
                data.args?.[2],
                data.args?.[3]
              );
              break;
            case "experimentalSuggestChain":
              await cosmosProvider.experimentalSuggestChain(data.args?.[0]);
              result = undefined;
              break;
            default:
              // Try to call the method on cosmosProvider if it exists
              if (typeof (cosmosProvider as any)[data.method] === "function") {
                result = await (cosmosProvider as any)[data.method](...(data.args || []));
              } else {
                throw new Error(`Method ${data.method} not supported`);
              }
          }

          // Send success response
          window.postMessage({
            type: "proxy-request-response",
            id: data.id,
            result: { return: result },
          }, "*");
        } catch (error) {
          // Send error response
          window.postMessage({
            type: "proxy-request-response",
            id: data.id,
            result: { error: error instanceof Error ? error.message : String(error) },
          }, "*");
        }
      }
    });

    // Inject as window.keplr
    (window as any).keplr = cosmosProvider;

    // Then make it non-writable
    Object.defineProperty(window, "keplr", {
      value: cosmosProvider,
      writable: false,
      enumerable: true,
      configurable: true,
    });

    // Also add getOfflineSigner methods to window (some dApps check these)
    (window as any).getOfflineSigner = (chainId: string) => cosmosProvider.getOfflineSigner(chainId);
    (window as any).getOfflineSignerOnlyAmino = (chainId: string) => cosmosProvider.getOfflineSignerOnlyAmino(chainId);
    (window as any).getOfflineSignerAuto = (chainId: string) => cosmosProvider.getOfflineSignerAuto(chainId);

    // Also expose on window.oko
    (window as any).oko = {
      ...(window as any).oko,
      cosmos: cosmosProvider,
    };

    // Dispatch Keplr initialization event
    window.dispatchEvent(new Event("keplr_keystorechange"));
  } catch (error) {
    console.error("[oko-injected] Failed to inject Cosmos provider:", error);
  }
}
