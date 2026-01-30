"use client";

import { useState } from "react";
import { useSdkStore } from "@/store/sdk";
import {
  OkoStandardWallet,
  buildSignInMessage,
  type WalletStandardConfig,
} from "@oko-wallet/oko-sdk-svm";
import {
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
  SolanaSignAndSendTransaction,
  type SolanaSignInFeature,
} from "@solana/wallet-standard-features";
import {
  SOLANA_CHAINS,
  SOLANA_MAINNET_CHAIN,
  SOLANA_DEVNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
} from "@solana/wallet-standard-chains";
import bs58 from "bs58";

// Config for wallet-standard features (used for SIWS testing)
const SOLANA_CONFIG: WalletStandardConfig = {
  chains: SOLANA_CHAINS,
  features: {
    signIn: SolanaSignIn,
    signMessage: SolanaSignMessage,
    signTransaction: SolanaSignTransaction,
    signAndSendTransaction: SolanaSignAndSendTransaction,
  },
  rpcEndpoints: {
    [SOLANA_MAINNET_CHAIN]: "https://api.mainnet-beta.solana.com",
    [SOLANA_DEVNET_CHAIN]: "https://api.devnet.solana.com",
    [SOLANA_TESTNET_CHAIN]: "https://api.testnet.solana.com",
  },
};
import Button from "./Button";

export function SiwsWidget() {
  const { okoSvmWallet } = useSdkStore();

  // SIWS input fields
  const [domain, setDomain] = useState("");
  const [statement, setStatement] = useState("Sign in to this application");
  const [nonce, setNonce] = useState("");
  const [uri, setUri] = useState("");

  // Result state
  const [result, setResult] = useState<{
    signedMessage: string;
    signature: string;
    address: string;
  } | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate random nonce
  const generateNonce = () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    setNonce(bs58.encode(array));
  };

  // Auto-fill domain and URI from current page
  const autoFillFromPage = () => {
    if (typeof window !== "undefined") {
      setDomain(window.location.host);
      setUri(window.location.href);
    }
  };

  // Preview the SIWS message
  const handlePreview = () => {
    if (!okoSvmWallet?.publicKey) {
      setError("Wallet not connected");
      return;
    }

    const address = okoSvmWallet.publicKey.toBase58();
    const message = buildSignInMessage(
      {
        domain: domain || undefined,
        statement: statement || undefined,
        uri: uri || undefined,
        nonce: nonce || undefined,
        issuedAt: new Date().toISOString(),
      },
      address,
    );
    setPreviewMessage(message);
  };

  // Execute SIWS
  const handleSignIn = async () => {
    if (!okoSvmWallet) {
      setError("SDK not initialized");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Create StandardWallet wrapper with config
      const standardWallet = new OkoStandardWallet(okoSvmWallet, [SOLANA_CONFIG]);

      // Call solana:signIn feature (cast to proper type since features is Record<string, unknown>)
      const signInFeature = standardWallet.features[
        "solana:signIn"
      ] as SolanaSignInFeature["solana:signIn"];

      const [signInResult] = await signInFeature.signIn({
        domain: domain || undefined,
        statement: statement || undefined,
        uri: uri || undefined,
        nonce: nonce || undefined,
        issuedAt: new Date().toISOString(),
      });

      setResult({
        signedMessage: new TextDecoder().decode(signInResult.signedMessage),
        signature: bs58.encode(signInResult.signature),
        address: signInResult.account.address,
      });

      console.log("[sandbox_sol] SIWS success:", signInResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error("[sandbox_sol] SIWS failed:", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-widget border border-widget-border rounded-3xl p-10 shadow-xl">
      <h3 className="text-2xl font-semibold tracking-tight mb-2">
        Sign In With Solana (SIWS)
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Authenticate using the wallet-standard solana:signIn feature
      </p>

      {/* Input Fields */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Domain */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
              Domain
            </label>
            <button
              onClick={autoFillFromPage}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Auto-fill from page
            </button>
          </div>
          <input
            type="text"
            className="w-full bg-widget-field border border-widget-border rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-widget-border-hover focus:ring-2 focus:ring-widget-border-hover transition-all"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
          />
        </div>

        {/* Statement */}
        <div>
          <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300 mb-2">
            Statement
          </label>
          <textarea
            className="w-full bg-widget-field border border-widget-border rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-widget-border-hover focus:ring-2 focus:ring-widget-border-hover transition-all resize-none"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Sign in to this application"
            rows={2}
          />
        </div>

        {/* URI */}
        <div>
          <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300 mb-2">
            URI (optional)
          </label>
          <input
            type="text"
            className="w-full bg-widget-field border border-widget-border rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-widget-border-hover focus:ring-2 focus:ring-widget-border-hover transition-all"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="https://example.com/login"
          />
        </div>

        {/* Nonce */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
              Nonce (optional)
            </label>
            <button
              onClick={generateNonce}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Generate random
            </button>
          </div>
          <input
            type="text"
            className="w-full bg-widget-field border border-widget-border rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-widget-border-hover focus:ring-2 focus:ring-widget-border-hover transition-all"
            value={nonce}
            onChange={(e) => setNonce(e.target.value)}
            placeholder="Random nonce for replay protection"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={handlePreview}
          disabled={!okoSvmWallet?.connected}
          variant="ghost"
          className="flex-1"
        >
          Preview Message
        </Button>
        <Button
          onClick={handleSignIn}
          disabled={isLoading || !okoSvmWallet?.connected}
          loading={isLoading}
          className="flex-1"
        >
          Sign In
        </Button>
      </div>

      {/* Preview */}
      {previewMessage && (
        <div className="mb-6">
          <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300 mb-2">
            Message Preview
          </label>
          <pre className="bg-widget-field border border-widget-border rounded-2xl px-6 py-4 text-xs font-mono whitespace-pre-wrap text-gray-300 overflow-auto max-h-48">
            {previewMessage}
          </pre>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-green-400 text-sm font-semibold mb-1">
              Sign In Successful
            </p>
            <p className="text-green-300/80 text-xs">
              Address: {result.address}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300 mb-2">
              Signed Message
            </label>
            <pre className="bg-widget-field border border-widget-border rounded-2xl px-6 py-4 text-xs font-mono whitespace-pre-wrap text-gray-300 overflow-auto max-h-32">
              {result.signedMessage}
            </pre>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300 mb-2">
              Signature (base58)
            </label>
            <code className="block bg-widget-field border border-widget-border rounded-2xl px-6 py-4 font-mono text-xs break-all text-green-400">
              {result.signature}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
