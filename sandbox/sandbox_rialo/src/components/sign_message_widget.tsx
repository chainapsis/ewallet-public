"use client";

import { useSignMessage } from "@rialo/frost";
import bs58 from "bs58";
import { useState } from "react";

import Button from "./Button";

export function SignMessageWidget() {
  const { mutate: signMessage, isPending } = useSignMessage();
  const [message, setMessage] = useState("Hello, Rialo!");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignMessage = () => {
    setError(null);
    setSignature(null);

    signMessage(
      { message },
      {
        onSuccess: (result) => {
          const signatureBase58 = bs58.encode(result.signature);
          setSignature(signatureBase58);
          console.log("[sandbox_frost_kit] Message signed:", signatureBase58);
        },
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
          console.error(
            "[sandbox_frost_kit] Failed to sign message:",
            errorMessage,
          );
        },
      },
    );
  };

  return (
    <div className="bg-widget border border-widget-border rounded-3xl p-10 shadow-xl">
      <h3 className="text-2xl font-semibold tracking-tight mb-2">
        Sign Message
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Sign an arbitrary message with your Rialo wallet
      </p>

      <div className="flex flex-col gap-3 mb-6">
        <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
          Message
        </label>
        <textarea
          className="w-full bg-widget-field border border-widget-border rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-widget-border-hover focus:ring-2 focus:ring-widget-border-hover transition-all resize-none"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message to sign..."
          rows={3}
        />
      </div>

      <Button
        onClick={handleSignMessage}
        disabled={isPending || !message}
        loading={isPending}
        fullWidth
        size="lg"
      >
        Sign Message
      </Button>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {signature && (
        <div className="mt-6 flex flex-col gap-3">
          <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
            Signature (base58)
          </label>
          <code className="block bg-widget-field border border-widget-border rounded-2xl px-6 py-5 font-mono text-xs break-all text-green-400">
            {signature}
          </code>
        </div>
      )}
    </div>
  );
}
