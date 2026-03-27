import { zodResolver } from "@hookform/resolvers/zod";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { svmConnection } from "@/constants/chains";
import TxForm from "./TxForm";
import TxResult from "./TxResult";
import TxTracking from "./TxTracking";

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

export default function SvmTransactionForm() {
  const { address: svmAddress, svmWallet: okoSvm } = useOkoSvm();
  const connection = svmConnection;
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

  async function handleSend(values: FormValues) {
    if (!svmAddress || !okoSvm || isTxSending) {
      return;
    }
    const { recipientAddress, amount } = values;

    setIsTxSending(true);
    let signatureForTracking: string | null = null;

    try {
      const fromPubkey = new PublicKey(svmAddress);
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
        queryKey: ["svm-balance", svmAddress],
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
    <div className="bg-widget border border-widget-border rounded-3xl p-6 shadow-xl">
      {!txSignature ? (
        <TxForm
          title="SVM Transfer (lamports)"
          recipientPlaceholder="Base58 address..."
          amountPlaceholder="0"
          register={register}
          errors={errors}
          onSubmit={handleSubmit(handleSend)}
          canSend={!!svmAddress && isValid && !isTxSending}
          loading={isTxSending}
        />
      ) : txStatus === "pending" ? (
        <TxTracking txHash={txSignature} explorerUrl={explorerTxUrl} />
      ) : (
        <TxResult
          success={txStatus === "confirmed"}
          explorerUrl={explorerTxUrl}
          onBack={resetForm}
        />
      )}
    </div>
  );
}
