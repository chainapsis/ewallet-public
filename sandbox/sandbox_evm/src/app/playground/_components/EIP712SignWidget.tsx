"use client";

import { useState } from "react";
import { useAccount, useChainId, useWalletClient } from "wagmi";

import { TextAreaInput } from "@oko-wallet-sandbox-evm/components/scaffold-eth/Input";

export function Eip712SignWidget() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  const [typedDataBlob, setTypedDataBlob] = useState<string>(`{
  "types": {
    "PermitSingle": [
      {
        "name": "details",
        "type": "PermitDetails"
      },
      {
        "name": "spender",
        "type": "address"
      },
      {
        "name": "sigDeadline",
        "type": "uint256"
      }
    ],
    "PermitDetails": [
      {
        "name": "token",
        "type": "address"
      },
      {
        "name": "amount",
        "type": "uint160"
      },
      {
        "name": "expiration",
        "type": "uint48"
      },
      {
        "name": "nonce",
        "type": "uint48"
      }
    ],
    "EIP712Domain": [
      {
        "name": "name",
        "type": "string"
      },
      {
        "name": "chainId",
        "type": "uint256"
      },
      {
        "name": "verifyingContract",
        "type": "address"
      }
    ]
  },
  "domain": {
    "name": "Permit2",
    "chainId": "8453",
    "verifyingContract": "0x000000000022d473030f116ddee9f6b43ac78ba3"
  },
  "primaryType": "PermitSingle",
  "message": {
    "details": {
      "token": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      "amount": "1461501637330902918203684832716283019655932542975",
      "expiration": "1760871862",
      "nonce": "1"
    },
    "spender": "0x6ff5693b99212da76ad316178a184ab56d299b43",
    "sigDeadline": "1758281662"
  }
}`);
  const [signature, setSignature] = useState<string>("");
  const [signedPayload, setSignedPayload] = useState<string>("");
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSignTypedData = async () => {
    if (!walletClient || !address) {
      return;
    }

    try {
      setIsSigning(true);
      setError("");
      setSignature("");
      setSignedPayload("");

      let parsed: any;
      try {
        parsed = JSON.parse(typedDataBlob);
      } catch {
        setError("Invalid JSON for typed data");
        return;
      }

      const { domain, types, primaryType, message } = parsed ?? {};
      if (!domain || !types || !primaryType || !message) {
        setError(
          "Typed data must include domain, types, primaryType, and message",
        );
        return;
      }

      // Remove EIP712Domain from types if provided
      const { EIP712Domain, ...typesNoDomain } = types ?? {};

      // Default chainId from connected network if missing
      const finalDomain = {
        ...domain,
        ...(domain.chainId
          ? {}
          : { chainId: Number(chainId) || domain.chainId }),
      };

      const sig = await walletClient.signTypedData({
        account: address,
        domain: finalDomain,
        types: typesNoDomain,
        primaryType,
        message,
      });

      setSignature(sig);
      setSignedPayload(
        JSON.stringify(
          { domain: finalDomain, types: typesNoDomain, primaryType, message },
          null,
          2,
        ),
      );
    } catch (e: any) {
      console.error(e);

      setError(e?.message || "Signing failed");
    } finally {
      setIsSigning(false);
    }
  };

  const copySignature = async () => {
    if (!signature) {
      return;
    }
    try {
      await navigator.clipboard.writeText(signature);
    } catch {}
  };

  const copyTypedData = async () => {
    if (!signedPayload) {
      return;
    }
    try {
      await navigator.clipboard.writeText(signedPayload);
    } catch {}
  };

  const resetForm = () => {
    setSignature("");
    setSignedPayload("");
    setError("");
  };

  const disabled = !walletClient || !address || isSigning;

  return (
    <div className="card bg-base-100 shadow-xl h-fit">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h2 className="card-title">EIP-712 Typed Data</h2>
          <div className="badge badge-outline">Chain ID: {chainId}</div>
        </div>
        <p className="text-sm text-base-content/70">
          Test generic EIP-712 typed data signing. Paste a typed data JSON with
          domain, types, primaryType, and message.
        </p>

        <div className="flex flex-col gap-2 mt-2">
          <label className="label">
            <span className="label-text">Typed Data JSON</span>
          </label>
          <TextAreaInput
            name="eip712-typed-data-json"
            value={typedDataBlob}
            onChange={(v) => setTypedDataBlob(v)}
            rows={10}
            placeholder='{"domain": {"name": "MyDapp", "version": "1", "chainId": 1, "verifyingContract": "0x..."}, "types": {"Mail": [...]}, "primaryType": "Mail", "message": { ... }}'
          />
        </div>

        <button
          type="button"
          onClick={handleSignTypedData}
          disabled={disabled}
          className="btn btn-primary w-full mt-4"
        >
          {isSigning ? "Signing..." : "Sign Typed Data"}
        </button>

        {error && (
          <div className="alert alert-error mt-4">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {signature && signedPayload && (
          <div className="alert alert-success flex flex-col items-start gap-2 mt-4">
            <div className="font-medium">EIP-712 Signature Generated</div>
            <div className="bg-base-200 rounded p-3 w-full max-h-40 overflow-x-auto overflow-y-auto">
              <code className="text-xs whitespace-pre font-mono text-base-content">
                {signature}
              </code>
            </div>
            <div className="w-full">
              <div className="text-sm font-medium mb-2">Signed Typed Data:</div>
              <div className="bg-base-200 rounded p-3 w-full max-h-40 overflow-x-auto overflow-y-auto">
                <code className="text-xs whitespace-pre font-mono text-base-content">
                  {signedPayload}
                </code>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copySignature}
                className="btn btn-xs btn-outline"
              >
                Copy Signature
              </button>
              <button
                type="button"
                onClick={copyTypedData}
                className="btn btn-xs btn-outline"
              >
                Copy Typed Data
              </button>
              <button
                type="button"
                onClick={resetForm}
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
