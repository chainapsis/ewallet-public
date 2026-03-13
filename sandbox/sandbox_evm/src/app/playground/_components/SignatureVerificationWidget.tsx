"use client";

import { useState } from "react";
import {
  createPublicClient,
  http,
  recoverMessageAddress,
  recoverTransactionAddress,
  recoverTypedDataAddress,
  type TransactionSerialized,
} from "viem";
import { mainnet } from "viem/chains";
import { parseSiweMessage } from "viem/siwe";

import {
  BytesInput,
  TextAreaInput,
} from "@oko-wallet-sandbox-evm/components/scaffold-eth/Input";

function PersonalSignVerifier() {
  const [personalMessage, setPersonalMessage] = useState<string>("");
  const [personalSignature, setPersonalSignature] = useState("");
  const [personalRecoveredAddress, setPersonalRecoveredAddress] = useState("");
  const [personalError, setPersonalError] = useState("");

  const verifyPersonalSignature = async () => {
    try {
      setPersonalError("");
      setPersonalRecoveredAddress("");

      if (!personalMessage || !personalSignature) {
        setPersonalError("Please provide both message and signature");
        return;
      }

      const recoveredAddress = await recoverMessageAddress({
        message: personalMessage,
        signature: personalSignature as `0x${string}`,
      });

      setPersonalRecoveredAddress(recoveredAddress);
    } catch (error) {
      setPersonalError(
        error instanceof Error ? error.message : "Verification failed",
      );
    }
  };

  const resetPersonalVerification = () => {
    setPersonalMessage("");
    setPersonalSignature("");
    setPersonalRecoveredAddress("");
    setPersonalError("");
  };

  return (
    <div className="space-y-4">
      <label className="label">
        <span className="label-text">Original Message</span>
      </label>
      <TextAreaInput
        name="personal-original-message"
        value={personalMessage}
        onChange={(v: any) => setPersonalMessage(v)}
        rows={4}
        placeholder="Enter the original message that was signed..."
      />
      <p className="text-xs text-base-content/60 -mt-2">
        The exact message that was signed (will be converted to hex). Example:
        "Hello, Oko!"
      </p>

      <label className="label">
        <span className="label-text">Signature</span>
      </label>
      <BytesInput
        name="personal-signature"
        placeholder="0x..."
        value={personalSignature}
        onChange={(val) => setPersonalSignature(val)}
        disableConvertToHex
      />
      <p className="text-xs text-base-content/60 -mt-2">
        The signature to verify (0x-prefixed hex string). Example: 0x1234...abcd
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={verifyPersonalSignature}
          className="btn btn-primary flex-1"
        >
          Verify Signature
        </button>
        <button
          type="button"
          onClick={resetPersonalVerification}
          className="btn btn-ghost"
        >
          Reset
        </button>
      </div>

      {personalError && (
        <div className="alert alert-error">
          <span className="text-sm">{personalError}</span>
        </div>
      )}

      {personalRecoveredAddress && (
        <div className="alert alert-success">
          <div className="font-medium">Signer Address Recovered</div>
          <div className="bg-base-200 rounded p-3 w-full overflow-x-auto">
            <code className="text-xs whitespace-pre font-mono text-base-content">
              {personalRecoveredAddress}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

function SiweVerifier() {
  const [siweMessage, setSiweMessage] = useState<string>("");
  const [siweSignature, setSiweSignature] = useState("");
  const [siweError, setSiweError] = useState("");
  const [siweAddress, setSiweAddress] = useState<`0x${string}` | null>(null);

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  const verifySiweSignature = async () => {
    try {
      setSiweError("");
      setSiweAddress(null);

      if (!siweMessage || !siweSignature) {
        setSiweError("Please provide both SIWE message and signature");
        return;
      }

      const parsed = parseSiweMessage(siweMessage);

      console.log(parsed);

      if (!parsed.address) {
        setSiweError("Invalid SIWE message");
        return;
      }

      const valid = await publicClient.verifySiweMessage({
        message: siweMessage,
        signature: siweSignature as `0x${string}`,
      });

      if (!valid) {
        setSiweError("Invalid signature");
        return;
      }

      setSiweAddress(parsed.address);
    } catch (error) {
      setSiweError(
        error instanceof Error ? error.message : "Verification failed",
      );
    }
  };

  const resetSiweVerification = () => {
    setSiweMessage("");
    setSiweSignature("");
    setSiweAddress(null);
    setSiweError("");
  };

  return (
    <div className="space-y-4">
      <label className="label">
        <span className="label-text">SIWE Message</span>
      </label>
      <TextAreaInput
        name="siwe-original-message"
        value={siweMessage}
        onChange={(v: any) => setSiweMessage(v)}
        rows={8}
        placeholder="Enter the original SIWE message that was signed..."
      />
      <p className="text-xs text-base-content/60 -mt-2">
        The exact SIWE message that was signed. Example:
        "oko-wallet-sandbox.vercel.app wants you to sign in..."
      </p>

      <label className="label">
        <span className="label-text">Signature</span>
      </label>
      <BytesInput
        name="siwe-signature"
        placeholder="0x..."
        value={siweSignature}
        onChange={(val) => setSiweSignature(val)}
        disableConvertToHex
      />
      <p className="text-xs text-base-content/60 -mt-2">
        The signature to verify (0x-prefixed hex string). Example: 0x1234...abcd
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={verifySiweSignature}
          className="btn btn-warning flex-1"
        >
          Verify SIWE
        </button>
        <button
          type="button"
          onClick={resetSiweVerification}
          className="btn btn-ghost"
        >
          Reset
        </button>
      </div>

      {siweError && (
        <div className="alert alert-error">
          <span className="text-sm">{siweError}</span>
        </div>
      )}

      {siweAddress && (
        <div className="alert alert-success">
          <div className="font-medium">Valid SIWE Signature</div>
          <div className="bg-base-200 rounded p-3 w-full overflow-x-auto">
            <code className="text-xs whitespace-pre font-mono text-base-content">
              {siweAddress}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

function TypedDataVerifier() {
  const [typedDataDomain, setTypedDataDomain] = useState(`{
  "name": "USDC",
  "version": "1",
  "chainId": 1,
  "verifyingContract": "0xA0b86a33E6441b8c4C8C0C0C0C0C0C0C0C0C0C0"
}`);
  const [typedDataTypes, setTypedDataTypes] = useState(`{
  "Permit": [
    {"name": "owner", "type": "address"},
    {"name": "spender", "type": "address"},
    {"name": "value", "type": "uint256"},
    {"name": "nonce", "type": "uint256"},
    {"name": "deadline", "type": "uint256"}
  ]
}`);
  const [typedDataPrimaryType, setTypedDataPrimaryType] =
    useState<string>("Permit");
  const [typedDataMessage, setTypedDataMessage] = useState(`{
  "owner": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "spender": "0xB0b86a33E6441b8c4C8C0C0C0C0C0C0C0C0C0C0",
  "value": "1000000000",
  "nonce": "0",
  "deadline": "1234567890"
}`);
  const [typedDataBlob, setTypedDataBlob] = useState<string>("");
  const [useTypedDataBlob, setUseTypedDataBlob] = useState<boolean>(true);
  const [typedDataSignature, setTypedDataSignature] = useState("");
  const [typedDataRecoveredAddress, setTypedDataRecoveredAddress] =
    useState("");
  const [typedDataError, setTypedDataError] = useState("");

  const parsedTypes = (() => {
    try {
      const t = JSON.parse(typedDataTypes);
      if (t && typeof t === "object") {
        return t as Record<string, any>;
      }
    } catch {}
    return {} as Record<string, any>;
  })();

  const typeNames = Object.keys(parsedTypes);
  const selectedFields = parsedTypes[typedDataPrimaryType] ?? [];

  const verifyTypedDataSignature = async () => {
    try {
      setTypedDataError("");
      setTypedDataRecoveredAddress("");

      if (!typedDataSignature) {
        setTypedDataError("Please provide a signature");
        return;
      }

      if (useTypedDataBlob) {
        if (!typedDataBlob) {
          setTypedDataError("Please provide typed data JSON");
          return;
        }
        let parsed: any;
        try {
          parsed = JSON.parse(typedDataBlob);
        } catch {
          setTypedDataError("Invalid JSON for typed data");
          return;
        }
        const { domain, types, primaryType, message } = parsed ?? {};
        if (!domain || !types || !primaryType || !message) {
          setTypedDataError(
            "Typed data must include domain, types, primaryType, and message",
          );
          return;
        }
        const recoveredAddress = await recoverTypedDataAddress({
          domain,
          types,
          primaryType,
          message,
          signature: typedDataSignature as `0x${string}`,
        });
        setTypedDataRecoveredAddress(recoveredAddress);
        return;
      }

      // Separate fields path
      if (!typedDataDomain || !typedDataTypes || !typedDataMessage) {
        setTypedDataError("Please provide domain, types, and message JSON");
        return;
      }
      const domain = JSON.parse(typedDataDomain);
      const types = JSON.parse(typedDataTypes);
      const message = JSON.parse(typedDataMessage);

      const recoveredAddress = await recoverTypedDataAddress({
        domain,
        types,
        primaryType: typedDataPrimaryType || "Permit",
        message,
        signature: typedDataSignature as `0x${string}`,
      });

      setTypedDataRecoveredAddress(recoveredAddress);
    } catch (error) {
      setTypedDataError(
        error instanceof Error ? error.message : "Verification failed",
      );
    }
  };

  const resetTypedDataVerification = () => {
    setTypedDataDomain("");
    setTypedDataTypes("");
    setTypedDataMessage("");
    setTypedDataBlob("");
    setTypedDataSignature("");
    setTypedDataRecoveredAddress("");
    setTypedDataError("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-sm">Mode:</div>
        <div className="tabs tabs-boxed">
          <a
            className={`tab ${useTypedDataBlob ? "tab-active" : ""}`}
            onClick={() => setUseTypedDataBlob(true)}
          >
            Single JSON
          </a>
          <a
            className={`tab ${!useTypedDataBlob ? "tab-active" : ""}`}
            onClick={() => setUseTypedDataBlob(false)}
          >
            Separate Fields
          </a>
        </div>
      </div>

      {useTypedDataBlob ? (
        <>
          <label className="label">
            <span className="label-text">Typed Data JSON</span>
          </label>
          <TextAreaInput
            name="typed-data-json"
            value={typedDataBlob}
            onChange={(v: any) => setTypedDataBlob(v)}
            rows={8}
            placeholder='{"domain": {"name": "Token", "version": "1", "chainId": 1, "verifyingContract": "0x..."}, "types": {"Permit": [...]}, "primaryType": "Permit", "message": { ... }}'
          />
        </>
      ) : (
        <>
          <label className="label">
            <span className="label-text">Domain (JSON)</span>
          </label>
          <TextAreaInput
            name="typed-data-domain"
            value={typedDataDomain}
            onChange={(v: any) => setTypedDataDomain(v)}
            rows={4}
            placeholder='{"name": "Token", "version": "1", "chainId": 1, "verifyingContract": "0x..."}'
          />

          <label className="label">
            <span className="label-text">Types (JSON)</span>
          </label>
          <TextAreaInput
            name="typed-data-types"
            value={typedDataTypes}
            onChange={(v: any) => setTypedDataTypes(v)}
            rows={4}
            placeholder='{"Permit": [{"name": "owner", "type": "address"}, ...]}'
          />

          <label className="label">
            <span className="label-text">Primary Type</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={typedDataPrimaryType}
            onChange={(e) => setTypedDataPrimaryType(e.target.value)}
          >
            {typeNames.length === 0 ? (
              <option value="">-</option>
            ) : (
              typeNames.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))
            )}
          </select>

          {selectedFields && Array.isArray(selectedFields) && (
            <div className="bg-base-200 rounded p-3">
              <div className="text-xs text-base-content/60 mb-2">
                Fields for {typedDataPrimaryType}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedFields.map((f: any, idx: number) => (
                  <div
                    key={`${f?.name ?? "field"}-${idx}`}
                    className="text-xs text-base-content"
                  >
                    <span className="font-mono">{String(f?.name)}</span>
                    <span className="mx-1">:</span>
                    <span className="font-mono opacity-80">
                      {String(f?.type)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="label">
            <span className="label-text">Message (JSON)</span>
          </label>
          <TextAreaInput
            name="typed-data-message"
            value={typedDataMessage}
            onChange={(v: any) => setTypedDataMessage(v)}
            rows={4}
            placeholder='{"owner": "0x...", "spender": "0x...", "value": "1000000000000000000", "nonce": "0", "deadline": "1234567890"}'
          />
        </>
      )}

      <label className="label">
        <span className="label-text">Signature</span>
      </label>
      <BytesInput
        name="typed-data-signature"
        placeholder="0x..."
        value={typedDataSignature}
        onChange={(val) => setTypedDataSignature(val)}
        disableConvertToHex
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={verifyTypedDataSignature}
          className="btn btn-success flex-1"
        >
          Verify Permit
        </button>
        <button
          type="button"
          onClick={resetTypedDataVerification}
          className="btn btn-ghost"
        >
          Reset
        </button>
      </div>

      {typedDataError && (
        <div className="alert alert-error">
          <span className="text-sm">{typedDataError}</span>
        </div>
      )}

      {typedDataRecoveredAddress && (
        <div className="alert alert-success">
          <div className="font-medium">Signer Address Recovered</div>
          <div className="bg-base-200 rounded p-3 w-full overflow-x-auto">
            <code className="text-xs whitespace-pre font-mono text-base-content">
              {typedDataRecoveredAddress}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionVerifier() {
  const [serializedTx, setSerializedTx] = useState<string>("");
  const [txRecoveredAddress, setTxRecoveredAddress] = useState<string>("");
  const [txError, setTxError] = useState<string>("");

  const verifyTransaction = async () => {
    try {
      setTxError("");
      setTxRecoveredAddress("");

      if (!serializedTx) {
        setTxError("Please provide a serialized transaction");
        return;
      }

      const input = serializedTx.trim() as TransactionSerialized;

      const recoveredAddress = await recoverTransactionAddress({
        serializedTransaction: input,
      });

      setTxRecoveredAddress(recoveredAddress);
    } catch (error) {
      setTxError(
        error instanceof Error ? error.message : "Verification failed",
      );
    }
  };

  const resetTxVerification = () => {
    setSerializedTx("");
    setTxRecoveredAddress("");
    setTxError("");
  };

  return (
    <div className="space-y-4">
      <label className="label">
        <span className="label-text">Serialized Transaction</span>
      </label>
      <BytesInput
        name="serialized-transaction"
        placeholder="0x02... (Signed RLP-encoded tx)"
        value={serializedTx}
        onChange={(val) => setSerializedTx(val)}
        disableConvertToHex
      />
      <p className="text-xs text-base-content/60 -mt-2">
        Paste a signed serialized transaction (0x-prefixed). Works with legacy &
        EIP-1559 transactions.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={verifyTransaction}
          className="btn btn-info flex-1"
        >
          Verify Transaction
        </button>
        <button
          type="button"
          onClick={resetTxVerification}
          className="btn btn-ghost"
        >
          Reset
        </button>
      </div>

      {txError && (
        <div className="alert alert-error">
          <span className="text-sm">{txError}</span>
        </div>
      )}

      {txRecoveredAddress && (
        <div className="alert alert-success">
          <div className="font-medium">Signer Address Recovered</div>
          <div className="bg-base-200 rounded p-3 w-full overflow-x-auto">
            <code className="text-xs whitespace-pre font-mono text-base-content">
              {txRecoveredAddress}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

export function SignatureVerificationWidget() {
  const [verificationType, setVerificationType] = useState<
    "personal" | "siwe" | "typed-data" | "transaction"
  >("personal");

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Signature Verification</h2>
        <p className="text-sm text-base-content/70">
          Verify signatures and recover signer addresses from personal signs,
          SIWE messages, EIP-712 typed data, and serialized transactions.
        </p>

        <div className="flex justify-between items-center mb-4">
          <div className="tabs tabs-boxed tabs-border">
            <a
              className={`tab ${verificationType === "personal" ? "tab-active" : ""}`}
              onClick={() => setVerificationType("personal")}
            >
              Personal Sign
            </a>
            <a
              className={`tab ${verificationType === "siwe" ? "tab-active" : ""}`}
              onClick={() => setVerificationType("siwe")}
            >
              SIWE
            </a>
            <a
              className={`tab ${verificationType === "typed-data" ? "tab-active" : ""}`}
              onClick={() => setVerificationType("typed-data")}
            >
              EIP-712
            </a>
            <a
              className={`tab ${verificationType === "transaction" ? "tab-active" : ""}`}
              onClick={() => setVerificationType("transaction")}
            >
              Transaction
            </a>
          </div>
        </div>

        {verificationType === "personal" && <PersonalSignVerifier />}
        {verificationType === "siwe" && <SiweVerifier />}
        {verificationType === "typed-data" && <TypedDataVerifier />}
        {verificationType === "transaction" && <TransactionVerifier />}
      </div>
    </div>
  );
}
