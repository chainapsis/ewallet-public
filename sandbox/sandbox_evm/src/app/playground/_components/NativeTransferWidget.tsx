"use client";

import { useState } from "react";
import { isAddress, parseEther } from "viem";
import { useAccount, useWalletClient } from "wagmi";

import {
  AddressInput,
  EtherInput,
} from "@oko-wallet-sandbox-evm/components/scaffold-eth/Input";
import { useTransactor } from "@oko-wallet-sandbox-evm/hooks/scaffold-eth";

export function NativeTransferWidget() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const writeTxn = useTransactor();

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTransfer = async () => {
    if (!walletClient || !address) {
      setError("Wallet not connected");
      return;
    }

    if (!toAddress || !amount) {
      setError("Please fill in all fields");
      return;
    }

    if (!isAddress(toAddress)) {
      setError("Invalid recipient address");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setTxHash(null);

      const parsedAmount = parseEther(amount);

      const makeWriteWithParams = () =>
        walletClient.sendTransaction({
          to: toAddress,
          value: parsedAmount,
        });

      const hash = await writeTxn(makeWriteWithParams);
      setTxHash(hash || null);
    } catch (err: any) {
      setError(err.message || "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setToAddress("");
    setAmount("");
    setTxHash(null);
    setError(null);
  };

  const copyTxHash = async () => {
    if (!txHash) {
      return;
    }
    try {
      await navigator.clipboard.writeText(txHash);
    } catch {}
  };

  return (
    <div className="card bg-base-100 shadow-xl h-fit">
      <div className="card-body">
        <h2 className="card-title">Native Asset Transfer</h2>
        <p className="text-sm text-base-content/70">
          Send native tokens (ETH, MATIC, etc.) to another address. This will
          execute a simple transfer transaction.
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="label">
              <span className="label-text">Recipient Address</span>
            </label>
            <AddressInput
              name="to-address"
              placeholder="0x..."
              value={toAddress}
              onChange={(val: string) => setToAddress(val)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label">
              <span className="label-text">Amount</span>
            </label>
            <EtherInput
              name="amount"
              placeholder="amount in ETH"
              value={amount}
              onChange={(val: string) => setAmount(val)}
              usdMode={true}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleTransfer}
          disabled={
            !walletClient || !address || isLoading || !toAddress || !amount
          }
          className="btn btn-primary w-full mt-4"
        >
          {isLoading ? "Sending..." : "Send Transaction"}
        </button>

        {error && (
          <div className="alert alert-error mt-4">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {txHash && (
          <div className="alert alert-success flex flex-col items-start gap-2 mt-4">
            <div className="font-medium">Transaction Sent Successfully!</div>
            <div className="bg-base-200 rounded p-3 w-full max-h-40 overflow-x-auto overflow-y-auto">
              <code className="text-xs whitespace-pre font-mono text-base-content">
                {txHash}
              </code>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyTxHash}
                className="btn btn-xs btn-outline"
              >
                Copy Hash
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-xs btn-ghost"
              >
                New Transfer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
