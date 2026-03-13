"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";

import { TextAreaInput } from "@oko-wallet-sandbox-evm/components/scaffold-eth/Input";
import { useSignMessage } from "@oko-wallet-sandbox-evm/hooks/scaffold-eth";

export function PersonalSignWidget() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [personalMessage, setPersonalMessage] = useState("Hello, Oko!");

  const {
    signMessage,
    signature,
    isLoading: personalSignLoading,
    error: personalSignError,
    reset: resetPersonalSign,
  } = useSignMessage();

  const handlePersonalSign = async () => {
    if (!walletClient || !address) {
      return;
    }

    await signMessage(walletClient, personalMessage);
  };

  const copySignature = async () => {
    if (!signature) {
      return;
    }
    try {
      await navigator.clipboard.writeText(signature);
    } catch {}
  };

  return (
    <div className="card bg-base-100 shadow-xl h-fit">
      <div className="card-body">
        <h2 className="card-title">Personal Sign</h2>
        <p className="text-sm text-base-content/70">
          Test personal message signing with your wallet. This allows you to
          sign arbitrary messages that can be verified with the signature.
        </p>

        <div className="flex flex-col gap-2">
          <label className="label">
            <span className="label-text">Message to Sign</span>
          </label>
          <TextAreaInput
            name="personal-message"
            placeholder="Enter message to sign..."
            value={personalMessage}
            onChange={(val) => setPersonalMessage(val)}
            rows={4}
          />
        </div>
        <button
          type="button"
          onClick={handlePersonalSign}
          disabled={!walletClient || !address || personalSignLoading}
          className="btn btn-primary w-full mt-4"
        >
          {personalSignLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              <span className="ml-2">Signing...</span>
            </>
          ) : (
            "Sign Message"
          )}
        </button>

        {personalSignError && (
          <div className="alert alert-error mt-4">
            <span className="text-sm">{personalSignError?.message}</span>
          </div>
        )}

        {signature && (
          <div className="alert alert-success flex flex-col items-start gap-2 mt-4">
            <div className="font-medium">Signature Generated</div>
            <div className="bg-base-200 rounded p-3 w-full max-h-40 overflow-x-auto overflow-y-auto">
              <code className="text-xs whitespace-pre font-mono text-base-content">
                {signature}
              </code>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copySignature}
                className="btn btn-xs btn-outline"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={resetPersonalSign}
                className="btn btn-xs btn-ghost"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
