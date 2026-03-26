"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import useConnection from "@/hooks/useConnection";
import Button from "./Button";

interface TransactionFormProps {
  className?: string;
}

function isValidBase58PublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

const formSchema = z.object({
  recipientAddress: z
    .string()
    .trim()
    .min(1, { message: "Required" })
    .refine((v) => isValidBase58PublicKey(v), {
      message: "Invalid Solana address",
    }),
  amount: z
    .string()
    .trim()
    .regex(/^[0-9]+$/, { message: "Enter a positive integer (lamports)" })
    .refine(
      (v) => {
        try {
          return BigInt(v) > BigInt(0);
        } catch {
          return false;
        }
      },
      { message: "Amount must be > 0" },
    ),
});

type FormValues = z.infer<typeof formSchema>;

export default function TransactionForm({ className }: TransactionFormProps) {
  const { address, svmWallet: okoSvm } = useOkoSvm();
  const connection = useConnection();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: { recipientAddress: "", amount: "" },
  });

  const [isTxSending, setIsTxSending] = useState(false);
  const [txSignature, setTxSignature] = useState("");
  const [txStatus, setTxStatus] = useState<"pending" | "confirmed" | "failed">(
    "pending",
  );

  const explorerTxUrl = useMemo(() => {
    return txSignature
      ? `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`
      : "";
  }, [txSignature]);

  async function handleSendTransaction(values: FormValues) {
    if (!address || !okoSvm || isTxSending) {
      return;
    }
    const { recipientAddress, amount } = values;

    setIsTxSending(true);
    let signatureForTracking: string | null = null;

    try {
      const fromPubkey = new PublicKey(address);
      const toPubkey = new PublicKey(recipientAddress);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: BigInt(amount),
        }),
      );

      transaction.feePayer = fromPubkey;
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      signatureForTracking = await okoSvm.sendTransaction(
        transaction,
        connection,
      );

      setTxSignature(signatureForTracking);
      setTxStatus("pending");
    } catch (error) {
      console.error(error);
    } finally {
      setIsTxSending(false);
    }

    if (!signatureForTracking) {
      return;
    }

    try {
      const result = await connection.confirmTransaction(
        signatureForTracking,
        "confirmed",
      );
      setTxStatus(result.value.err ? "failed" : "confirmed");

      await queryClient.invalidateQueries({
        queryKey: ["balance", address],
        exact: true,
      });
    } catch (error) {
      console.error(error);
    }
  }

  function resetForm() {
    reset();
    setTxSignature("");
    setTxStatus("pending");
  }

  return (
    <div
      className={`bg-widget border border-widget-border rounded-3xl p-10 shadow-xl min-h-[360px] flex flex-col ${
        className ?? ""
      }`}
    >
      {!txSignature ? (
        <FormView
          register={register}
          errors={errors}
          onSubmit={handleSubmit(handleSendTransaction)}
          canSend={!!address && isValid && !isTxSending}
          loading={isTxSending}
        />
      ) : txStatus === "pending" ? (
        <TrackingView txHash={txSignature} explorerTxUrl={explorerTxUrl} />
      ) : (
        <ResultView
          status={txStatus}
          explorerTxUrl={explorerTxUrl}
          onBack={resetForm}
        />
      )}
    </div>
  );
}

function FormView(props: {
  register: ReturnType<typeof useForm<FormValues>>["register"];
  errors: Record<string, { message?: string }>;
  onSubmit: () => void;
  canSend: boolean;
  loading: boolean;
}) {
  const { register, errors, onSubmit, canSend, loading } = props;
  return (
    <div className="flex flex-col gap-5 flex-1">
      <h3 className="text-2xl font-semibold tracking-tight mb-2">
        Send Transaction
      </h3>
      <div className="flex flex-col gap-3">
        <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300 mb-2">
          Recipient Address
        </label>
        <input
          type="text"
          placeholder="Base58 address..."
          className={`w-full bg-widget-field border rounded-2xl px-6 py-5 font-mono text-sm focus:outline-none transition-all ${
            errors.recipientAddress
              ? "border-red-500/70 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/40"
              : "border-widget-border focus:border-widget-border-hover focus:ring-2 focus:ring-widget-border-hover"
          }`}
          {...register("recipientAddress")}
        />
        {errors.recipientAddress?.message && (
          <p className="text-xs text-red-400">
            {errors.recipientAddress.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300 mb-2">
          Amount (Lamports)
        </label>
        <input
          type="text"
          placeholder="0"
          className={`w-full bg-widget-field border rounded-2xl px-6 py-5 text-sm focus:outline-none transition-all ${
            errors.amount
              ? "border-red-500/70 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/40"
              : "border-widget-border focus:border-widget-border-hover focus:ring-2 focus:ring-widget-border-hover"
          }`}
          {...register("amount")}
        />
        {errors.amount?.message && (
          <p className="text-xs text-red-400">{errors.amount.message}</p>
        )}
      </div>

      <Button
        className="mt-auto"
        fullWidth
        size="lg"
        disabled={!canSend}
        loading={loading}
        onClick={onSubmit}
      >
        Send Transaction
      </Button>
    </div>
  );
}

function TrackingView({
  txHash,
  explorerTxUrl,
}: {
  txHash: string;
  explorerTxUrl: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center flex-1">
      <div className="h-12 w-12 border-2 border-current border-t-transparent rounded-full animate-spin" />
      <div className="px-4">
        <h3 className="text-2xl font-semibold tracking-tight">
          Tracking transaction…
        </h3>
        <p className="text-xs text-gray-300 mt-3 font-mono break-all whitespace-pre-wrap max-w-full">
          {txHash}
        </p>
      </div>
      {explorerTxUrl && (
        <Link
          href={explorerTxUrl}
          target="_blank"
          className="text-sm text-gray-300 hover:text-white underline underline-offset-4"
        >
          View on explorer
        </Link>
      )}
    </div>
  );
}

function ResultView({
  status,
  explorerTxUrl,
  onBack,
}: {
  status: "confirmed" | "failed";
  explorerTxUrl: string;
  onBack: () => void;
}) {
  const isSuccess = status === "confirmed";
  return (
    <div className="flex flex-col h-full flex-1">
      <div className="flex flex-col items-center justify-center gap-6 text-center flex-1">
        <div
          className={`h-12 w-12 rounded-full flex items-center justify-center ${
            isSuccess
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {isSuccess ? (
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 6L18 18M6 18L18 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <h3 className="text-2xl font-semibold tracking-tight">
          {isSuccess ? "Transaction confirmed" : "Transaction failed"}
        </h3>
        {explorerTxUrl && (
          <Link
            href={explorerTxUrl}
            target="_blank"
            className="text-sm text-gray-300 hover:text-white underline underline-offset-4"
          >
            View on explorer
          </Link>
        )}
      </div>
      <Button size="lg" fullWidth onClick={onBack}>
        Try again
      </Button>
    </div>
  );
}
