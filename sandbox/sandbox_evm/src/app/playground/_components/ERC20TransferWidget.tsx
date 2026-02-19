"use client";

import { useState } from "react";
import {
  useAccount,
  useWalletClient,
  usePublicClient,
  useReadContract,
} from "wagmi";
import { isAddress, encodeFunctionData, formatUnits, parseUnits } from "viem";

import { useTransactor } from "@oko-wallet-sandbox-evm/hooks/scaffold-eth";
import { AddressInput } from "@oko-wallet-sandbox-evm/components/scaffold-eth/Input";
import { USDCAbi } from "@oko-wallet-sandbox-evm/contracts/abis/USDC";

const ERC20_ABI = USDCAbi;

export function ERC20TransferWidget() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const writeTxn = useTransactor();

  const [tokenAddress, setTokenAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validTokenAddress = isAddress(tokenAddress)
    ? (tokenAddress as `0x${string}`)
    : undefined;

  const { data: tokenSymbol } = useReadContract({
    address: validTokenAddress,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!validTokenAddress },
  });

  const { data: tokenDecimals } = useReadContract({
    address: validTokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!validTokenAddress },
  });

  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: validTokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!validTokenAddress && !!address },
  });

  const decimals = tokenDecimals ?? 18;

  const handleTransfer = async () => {
    if (!walletClient || !address) {
      setError("Wallet not connected");
      return;
    }

    if (!tokenAddress || !toAddress || !amount) {
      setError("Please fill in all fields");
      return;
    }

    if (!isAddress(tokenAddress)) {
      setError("Invalid token address");
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

      const parsedAmount = parseUnits(amount, decimals);

      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [toAddress as `0x${string}`, parsedAmount],
      });

      const makeWriteWithParams = () =>
        walletClient.sendTransaction({
          to: tokenAddress as `0x${string}`,
          data,
        });

      const hash = await writeTxn(makeWriteWithParams);
      setTxHash(hash || null);
      refetchBalance();
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
    if (!txHash) return;
    try {
      await navigator.clipboard.writeText(txHash);
    } catch {}
  };

  return (
    <div className="card bg-base-100 shadow-xl h-fit">
      <div className="card-body">
        <h2 className="card-title">ERC-20 Token Transfer</h2>
        <p className="text-sm text-base-content/70">
          Send ERC-20 tokens (USDC, DAI, etc.) to another address. Enter the
          token contract address, recipient, and amount.
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="label">
              <span className="label-text">Token Contract Address</span>
            </label>
            <AddressInput
              name="token-address"
              placeholder="0x... (ERC-20 token contract)"
              value={tokenAddress}
              onChange={(val: string) => setTokenAddress(val)}
            />
            {validTokenAddress && tokenSymbol && (
              <div className="flex items-center gap-2 text-sm text-base-content/70">
                <span className="badge badge-outline badge-sm">
                  {tokenSymbol}
                </span>
                {tokenBalance !== undefined && (
                  <span>
                    Balance: {formatUnits(tokenBalance, decimals)} {tokenSymbol}
                  </span>
                )}
              </div>
            )}
          </div>

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
              <span className="label-text">
                Amount{tokenSymbol ? ` (${tokenSymbol})` : ""}
              </span>
            </label>
            <input
              type="text"
              placeholder={`Amount${tokenDecimals !== undefined ? ` (${tokenDecimals} decimals)` : ""}`}
              className="input input-bordered w-full"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleTransfer}
          disabled={
            !walletClient ||
            !address ||
            isLoading ||
            !tokenAddress ||
            !toAddress ||
            !amount
          }
          className="btn btn-primary w-full mt-4"
        >
          {isLoading ? "Sending..." : "Send Tokens"}
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
              <button onClick={copyTxHash} className="btn btn-xs btn-outline">
                Copy Hash
              </button>
              <button onClick={resetForm} className="btn btn-xs btn-ghost">
                New Transfer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
