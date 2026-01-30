"use client";

import {
  Authorized,
  Keypair,
  LAMPORTS_PER_SOL,
  Lockup,
  PublicKey,
  StakeProgram,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  type ParsedAccountData,
} from "@solana/web3.js";
import bs58 from "bs58";
import { useState, useEffect, useCallback } from "react";

import { DEVNET_CONNECTION } from "@/lib/connection";
import { useSdkStore } from "@/store/sdk";
import Button from "./Button";

type TestTxType =
  | "sol_transfer"
  | "multi_sol_transfer"
  | "create_account"
  | "versioned_tx"
  | "native_stake"
  | "native_stake_deactivate";

interface TestTxOption {
  id: TestTxType;
  name: string;
  description: string;
}

const TEST_TX_OPTIONS: TestTxOption[] = [
  {
    id: "sol_transfer",
    name: "SOL Transfer",
    description: "Simple SOL transfer using System Program",
  },
  {
    id: "multi_sol_transfer",
    name: "Multi SOL Transfer",
    description: "3 SOL transfers in one transaction",
  },
  {
    id: "create_account",
    name: "Create Account",
    description: "System Program createAccount instruction",
  },
  {
    id: "versioned_tx",
    name: "Versioned Transaction",
    description: "SOL transfer using VersionedTransaction (V0)",
  },
  {
    id: "native_stake",
    name: "Native Stake (Create + Delegate)",
    description: "Create stake account and delegate to validator",
  },
  {
    id: "native_stake_deactivate",
    name: "Native Stake (Deactivate)",
    description: "Deactivate a stake account",
  },
];

interface ValidatorInfo {
  name: string;
  voteAccount: string;
}

interface StakeAccountInfo {
  pubkey: string;
  lamports: number;
  state: string;
  activationEpoch: string | null;
  deactivationEpoch: string | null;
  voter: string | null;
}

function formatSol(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
}

export function TestTransactionsWidget() {
  const { okoSvmWallet, publicKey } = useSdkStore();
  const [selectedTx, setSelectedTx] = useState<TestTxType>("sol_transfer");
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTestTransaction = async (): Promise<
    Transaction | VersionedTransaction
  > => {
    if (!publicKey) {
      throw new Error("No public key");
    }

    const fromPubkey = new PublicKey(publicKey);
    const { blockhash } = await DEVNET_CONNECTION.getLatestBlockhash();

    const testRecipient = new PublicKey("11111111111111111111111111111112");

    switch (selectedTx) {
      case "sol_transfer": {
        return new Transaction({
          recentBlockhash: blockhash,
          feePayer: fromPubkey,
        }).add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey: testRecipient,
            lamports: 0.001 * LAMPORTS_PER_SOL,
          }),
        );
      }

      case "multi_sol_transfer": {
        const tx = new Transaction({
          recentBlockhash: blockhash,
          feePayer: fromPubkey,
        });

        for (let i = 0; i < 3; i++) {
          tx.add(
            SystemProgram.transfer({
              fromPubkey,
              toPubkey: new PublicKey(
                `1111111111111111111111111111111${i + 2}`,
              ),
              lamports: (0.0001 + i * 0.0001) * LAMPORTS_PER_SOL,
            }),
          );
        }

        return tx;
      }

      case "create_account": {
        const newAccount = PublicKey.unique();

        return new Transaction({
          recentBlockhash: blockhash,
          feePayer: fromPubkey,
        }).add(
          SystemProgram.createAccount({
            fromPubkey,
            newAccountPubkey: newAccount,
            lamports: 0.001 * LAMPORTS_PER_SOL,
            space: 0,
            programId: SystemProgram.programId,
          }),
        );
      }

      case "versioned_tx": {
        const message = new TransactionMessage({
          payerKey: fromPubkey,
          recentBlockhash: blockhash,
          instructions: [
            SystemProgram.transfer({
              fromPubkey,
              toPubkey: testRecipient,
              lamports: 0.001 * LAMPORTS_PER_SOL,
            }),
          ],
        }).compileToV0Message();

        return new VersionedTransaction(message);
      }

      case "native_stake": {
        // Create a new stake account keypair
        const stakeAccount = Keypair.generate();

        // Devnet validator vote account (Solana Foundation validator)
        const validatorVoteAccount = new PublicKey(
          "CertusDeBmqN8ZawdkxK5kFGMwBXdudvWHYwtNgNhvLu",
        );

        const stakeAmount = 1 * LAMPORTS_PER_SOL; // 1 SOL to stake
        const rentExemptAmount = 2282880; // ~0.00228288 SOL for rent

        const tx = new Transaction({
          recentBlockhash: blockhash,
          feePayer: fromPubkey,
        });

        // Create stake account
        tx.add(
          StakeProgram.createAccount({
            fromPubkey,
            stakePubkey: stakeAccount.publicKey,
            authorized: new Authorized(fromPubkey, fromPubkey),
            lockup: new Lockup(0, 0, fromPubkey),
            lamports: stakeAmount + rentExemptAmount,
          }),
        );

        // Delegate to validator
        tx.add(
          StakeProgram.delegate({
            stakePubkey: stakeAccount.publicKey,
            authorizedPubkey: fromPubkey,
            votePubkey: validatorVoteAccount,
          }),
        );

        // Need to partially sign with stake account keypair
        tx.partialSign(stakeAccount);

        return tx;
      }

      case "native_stake_deactivate": {
        // For testing, we'll create a mock stake account address
        // In real usage, this would be an existing stake account
        const mockStakeAccount = Keypair.generate();

        const tx = new Transaction({
          recentBlockhash: blockhash,
          feePayer: fromPubkey,
        });

        tx.add(
          StakeProgram.deactivate({
            stakePubkey: mockStakeAccount.publicKey,
            authorizedPubkey: fromPubkey,
          }),
        );

        return tx;
      }

      default:
        throw new Error("Unknown transaction type");
    }
  };

  const handleSignTransaction = async () => {
    if (!okoSvmWallet || !publicKey) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSignature(null);

    try {
      const tx = await createTestTransaction();

      const signedTx = await okoSvmWallet.signTransaction(tx);

      if (signedTx instanceof VersionedTransaction) {
        const sig = signedTx.signatures[0];
        setSignature(sig ? bs58.encode(sig) : "Signed (no signature)");
      } else {
        const sig = signedTx.signature;
        setSignature(sig ? bs58.encode(sig) : "Signed (no signature)");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-widget border border-widget-border rounded-3xl p-10 shadow-xl">
      <h3 className="text-2xl font-semibold tracking-tight mb-2">
        Test Transactions
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Test various transaction types to verify parser
      </p>

      <div className="flex flex-col gap-4 mb-6">
        {TEST_TX_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
              selectedTx === option.id
                ? "border-purple-500 bg-purple-500/10"
                : "border-widget-border hover:border-widget-border-hover"
            }`}
          >
            <input
              type="radio"
              name="txType"
              value={option.id}
              checked={selectedTx === option.id}
              onChange={() => setSelectedTx(option.id)}
              className="mt-1"
            />
            <div>
              <div className="font-semibold text-white">{option.name}</div>
              <div className="text-sm text-gray-400">{option.description}</div>
            </div>
          </label>
        ))}
      </div>

      <Button
        onClick={handleSignTransaction}
        disabled={isLoading}
        loading={isLoading}
        size="lg"
        className="w-full"
      >
        Sign Test Transaction
      </Button>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {signature && (
        <div className="mt-6 flex flex-col gap-3">
          <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
            Signature
          </label>
          <code className="block bg-widget-field border border-widget-border rounded-2xl px-6 py-5 font-mono text-xs break-all text-green-400">
            {signature}
          </code>
        </div>
      )}
    </div>
  );
}

/**
 * Real Staking Widget - Create, delegate, deactivate, and withdraw stake accounts
 */
export function StakingWidget() {
  const { okoSvmWallet, publicKey } = useSdkStore();

  // Staking form state
  const [stakeAmount, setStakeAmount] = useState("0.1");
  const [selectedValidator, setSelectedValidator] = useState("");

  // Validator list fetched from devnet
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [isLoadingValidators, setIsLoadingValidators] = useState(false);

  // Stake accounts state
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccountInfo[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // Transaction state
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch active validators from devnet
  useEffect(() => {
    let cancelled = false;

    const fetchValidators = async () => {
      setIsLoadingValidators(true);
      try {
        const { current } = await DEVNET_CONNECTION.getVoteAccounts();
        const sorted = current
          .sort((a, b) => b.activatedStake - a.activatedStake)
          .slice(0, 20);

        if (cancelled) return;

        const list: ValidatorInfo[] = sorted.map((v) => ({
          name: `${v.votePubkey.slice(0, 8)}... (stake: ${formatSol(v.activatedStake)})`,
          voteAccount: v.votePubkey,
        }));

        setValidators(list);
        if (list.length > 0 && !selectedValidator) {
          setSelectedValidator(list[0].voteAccount);
        }
      } catch (err) {
        console.error("Failed to fetch validators:", err);
      } finally {
        if (!cancelled) setIsLoadingValidators(false);
      }
    };

    fetchValidators();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch stake accounts owned by the user
  const fetchStakeAccounts = useCallback(async () => {
    if (!publicKey) return;

    setIsLoadingAccounts(true);
    try {
      const accounts = await DEVNET_CONNECTION.getParsedProgramAccounts(
        StakeProgram.programId,
        {
          filters: [
            {
              memcmp: {
                offset: 12, // Staker authority offset in stake account
                bytes: publicKey,
              },
            },
          ],
        },
      );

      const parsed: StakeAccountInfo[] = accounts.map((acc) => {
        const data = acc.account.data as ParsedAccountData;
        const info = data.parsed?.info;
        const stake = info?.stake;

        let state = "unknown";
        if (data.parsed?.type) {
          state = data.parsed.type;
        }

        return {
          pubkey: acc.pubkey.toBase58(),
          lamports: acc.account.lamports,
          state,
          activationEpoch: stake?.delegation?.activationEpoch ?? null,
          deactivationEpoch: stake?.delegation?.deactivationEpoch ?? null,
          voter: stake?.delegation?.voter ?? null,
        };
      });

      setStakeAccounts(parsed);
    } catch (err) {
      console.error("Failed to fetch stake accounts:", err);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchStakeAccounts();
  }, [fetchStakeAccounts]);

  // Create stake account and delegate
  const handleStake = async () => {
    if (!okoSvmWallet || !publicKey) return;

    setIsLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      const fromPubkey = new PublicKey(publicKey);
      const { blockhash, lastValidBlockHeight } =
        await DEVNET_CONNECTION.getLatestBlockhash();

      // Create a new stake account keypair
      const stakeAccount = Keypair.generate();
      const validatorVoteAccount = new PublicKey(selectedValidator);

      const lamportsToStake = Math.floor(
        parseFloat(stakeAmount) * LAMPORTS_PER_SOL,
      );
      const rentExemptAmount = 2282880; // ~0.00228288 SOL for rent

      if (lamportsToStake <= 0) {
        throw new Error("Stake amount must be greater than 0");
      }

      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPubkey,
      });

      // Create stake account
      tx.add(
        StakeProgram.createAccount({
          fromPubkey,
          stakePubkey: stakeAccount.publicKey,
          authorized: new Authorized(fromPubkey, fromPubkey),
          lockup: new Lockup(0, 0, fromPubkey),
          lamports: lamportsToStake + rentExemptAmount,
        }),
      );

      // Delegate to validator
      tx.add(
        StakeProgram.delegate({
          stakePubkey: stakeAccount.publicKey,
          authorizedPubkey: fromPubkey,
          votePubkey: validatorVoteAccount,
        }),
      );

      // Partially sign with stake account keypair
      tx.partialSign(stakeAccount);

      // Sign with user's wallet and send
      const signedTx = await okoSvmWallet.signTransaction(tx);

      const signature = await DEVNET_CONNECTION.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false },
      );

      await DEVNET_CONNECTION.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      setTxSignature(signature);

      // Refresh stake accounts
      await fetchStakeAccounts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Deactivate a stake account
  const handleDeactivate = async (stakeAccountPubkey: string) => {
    if (!okoSvmWallet || !publicKey) return;

    setIsLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      const fromPubkey = new PublicKey(publicKey);
      const stakePubkey = new PublicKey(stakeAccountPubkey);
      const { blockhash, lastValidBlockHeight } =
        await DEVNET_CONNECTION.getLatestBlockhash();

      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPubkey,
      });

      tx.add(
        StakeProgram.deactivate({
          stakePubkey,
          authorizedPubkey: fromPubkey,
        }),
      );

      const signedTx = await okoSvmWallet.signTransaction(tx);

      const signature = await DEVNET_CONNECTION.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false },
      );

      await DEVNET_CONNECTION.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      setTxSignature(signature);
      await fetchStakeAccounts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Withdraw from a deactivated stake account
  const handleWithdraw = async (
    stakeAccountPubkey: string,
    lamports: number,
  ) => {
    if (!okoSvmWallet || !publicKey) return;

    setIsLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      const fromPubkey = new PublicKey(publicKey);
      const stakePubkey = new PublicKey(stakeAccountPubkey);
      const { blockhash, lastValidBlockHeight } =
        await DEVNET_CONNECTION.getLatestBlockhash();

      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPubkey,
      });

      tx.add(
        StakeProgram.withdraw({
          stakePubkey,
          authorizedPubkey: fromPubkey,
          toPubkey: fromPubkey,
          lamports,
        }),
      );

      const signedTx = await okoSvmWallet.signTransaction(tx);

      const signature = await DEVNET_CONNECTION.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false },
      );

      await DEVNET_CONNECTION.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      setTxSignature(signature);
      await fetchStakeAccounts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "delegated":
        return "text-green-400";
      case "deactivating":
        return "text-yellow-400";
      case "inactive":
        return "text-gray-400";
      default:
        return "text-blue-400";
    }
  };

  const canDeactivate = (state: string) =>
    state === "delegated" || state === "activating";
  const canWithdraw = (state: string) => state === "inactive";

  return (
    <div className="bg-widget border border-widget-border rounded-3xl p-10 shadow-xl">
      <h3 className="text-2xl font-semibold tracking-tight mb-2">
        Staking (Devnet)
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Create, delegate, deactivate, and withdraw stake accounts
      </p>

      {/* Create Stake Form */}
      <div className="mb-8 p-6 bg-widget-field border border-widget-border rounded-2xl">
        <h4 className="text-lg font-semibold mb-4">Create New Stake</h4>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300 mb-2">
              Amount (SOL)
            </label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full bg-widget border border-widget-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              placeholder="0.1"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300 mb-2">
              Validator
            </label>
            {isLoadingValidators ? (
              <div className="w-full bg-widget border border-widget-border rounded-xl px-4 py-3 text-gray-400">
                Loading validators...
              </div>
            ) : (
              <select
                value={selectedValidator}
                onChange={(e) => setSelectedValidator(e.target.value)}
                className="w-full bg-widget border border-widget-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              >
                {validators.map((v) => (
                  <option key={v.voteAccount} value={v.voteAccount}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Button
            onClick={handleStake}
            disabled={isLoading || !publicKey || !selectedValidator}
            loading={isLoading}
            size="lg"
            className="w-full mt-2"
          >
            Stake SOL
          </Button>
        </div>
      </div>

      {/* Stake Accounts List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">Your Stake Accounts</h4>
          <button
            onClick={fetchStakeAccounts}
            disabled={isLoadingAccounts}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            {isLoadingAccounts ? "Loading..." : "Refresh"}
          </button>
        </div>

        {stakeAccounts.length === 0 ? (
          <div className="text-gray-400 text-sm p-4 bg-widget-field border border-widget-border rounded-xl">
            No stake accounts found
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {stakeAccounts.map((account) => (
              <div
                key={account.pubkey}
                className="p-4 bg-widget-field border border-widget-border rounded-xl"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <code className="text-xs text-gray-400 break-all">
                      {account.pubkey}
                    </code>
                  </div>
                  <span
                    className={`text-xs font-semibold uppercase ${getStateColor(account.state)}`}
                  >
                    {account.state}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="text-lg font-semibold text-white">
                    {formatSol(account.lamports)} SOL
                  </div>
                  <div className="flex gap-2">
                    {canDeactivate(account.state) && (
                      <button
                        onClick={() => handleDeactivate(account.pubkey)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    )}
                    {canWithdraw(account.state) && (
                      <button
                        onClick={() =>
                          handleWithdraw(account.pubkey, account.lamports)
                        }
                        disabled={isLoading}
                        className="px-3 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>

                {account.voter && (
                  <div className="mt-2 text-xs text-gray-400">
                    Validator:{" "}
                    <code className="text-gray-300">
                      {account.voter.slice(0, 8)}...
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Transaction Signature */}
      {txSignature && (
        <div className="mt-6 flex flex-col gap-3">
          <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
            Transaction Signature
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 block bg-widget-field border border-widget-border rounded-2xl px-6 py-5 font-mono text-xs break-all text-green-400">
              {txSignature}
            </code>
          </div>
          <a
            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            View on Solana Explorer
          </a>
        </div>
      )}
    </div>
  );
}
