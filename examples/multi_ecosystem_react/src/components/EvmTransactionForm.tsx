import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { type Hex, isAddress, toHex } from "viem";
import { z } from "zod";

import useEvm from "@/oko/useEvm";
import TxForm from "./TxForm";
import TxResult from "./TxResult";
import TxTracking from "./TxTracking";

const formSchema = z.object({
  recipientAddress: z
    .string()
    .trim()
    .min(1, { message: "Required" })
    .refine((v) => isAddress(v), { message: "Invalid address" }),
  amount: z
    .string()
    .trim()
    .regex(/^[0-9]+$/, { message: "Enter a positive integer (wei)" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function EvmTransactionForm() {
  const { address, okoEth, publicClient } = useEvm();
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
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [txStatus, setTxStatus] = useState<"pending" | "confirmed" | "failed">(
    "pending",
  );

  const explorerTxUrl = useMemo(() => {
    return txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : "";
  }, [txHash]);

  async function handleSend(values: FormValues) {
    if (!address || !okoEth || isTxSending) {
      return;
    }
    const { recipientAddress, amount } = values;

    setIsTxSending(true);

    let txHashForTracking: Hex | null = null;

    try {
      const provider = await okoEth.getEthereumProvider();

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });

      const current = await provider.request({
        method: "eth_chainId",
      });

      if (current !== "0xaa36a7") {
        throw new Error("Not on the correct chain");
      }

      txHashForTracking = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            to: recipientAddress as `0x${string}`,
            value: toHex(BigInt(amount)),
          },
        ],
      });

      setTxHash(txHashForTracking);
      setTxStatus("pending");
    } catch (error) {
      console.error(error);
    } finally {
      setIsTxSending(false);
    }

    if (!txHashForTracking) {
      return;
    }

    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHashForTracking,
      });
      setTxStatus(receipt.status === "success" ? "confirmed" : "failed");

      await queryClient.invalidateQueries({
        queryKey: ["evm-balance", address],
        exact: true,
      });
    } catch (error) {
      console.error(error);
    }
  }

  function resetForm() {
    reset();
    setTxHash(null);
    setTxStatus("pending");
  }

  return (
    <div className="bg-widget border border-widget-border rounded-3xl p-6 shadow-xl">
      {!txHash ? (
        <TxForm
          title="EVM Transfer (wei)"
          recipientPlaceholder="0x..."
          amountPlaceholder="0"
          register={register}
          errors={errors}
          onSubmit={handleSubmit(handleSend)}
          canSend={!!address && isValid && !isTxSending}
          loading={isTxSending}
        />
      ) : txStatus === "pending" ? (
        <TxTracking txHash={txHash} explorerUrl={explorerTxUrl} />
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
