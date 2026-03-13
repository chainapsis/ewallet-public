import { fromBech32 } from "@cosmjs/encoding";
import { SigningStargateClient, StargateClient } from "@cosmjs/stargate";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import useCosmos from "@/oko/useCosmos";
import TxForm from "./TxForm";
import TxResult from "./TxResult";
import TxTracking from "./TxTracking";

function bech32Basic(addr: string) {
  try {
    fromBech32(addr);
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
    .refine((v) => bech32Basic(v), { message: "Invalid bech32 address" }),
  amount: z
    .string()
    .trim()
    .regex(/^[0-9]+$/, { message: "Enter a positive integer (uosmo)" })
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

export default function CosmosTransactionForm() {
  const { bech32Address, offlineSigner, chainInfo } = useCosmos();
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
  const [txHash, setTxHash] = useState("");
  const [txStatus, setTxStatus] = useState<"pending" | "confirmed" | "failed">(
    "pending",
  );

  const explorerTxUrl = useMemo(() => {
    return txHash ? `https://www.mintscan.io/osmosis-testnet/tx/${txHash}` : "";
  }, [txHash]);

  async function handleSend(values: FormValues) {
    if (!bech32Address || !offlineSigner || isTxSending) {
      return;
    }

    const { recipientAddress, amount } = values;

    try {
      const { prefix } = fromBech32(recipientAddress);
      if (
        chainInfo.bech32Config?.bech32PrefixAccAddr &&
        prefix !== chainInfo.bech32Config?.bech32PrefixAccAddr
      ) {
        return;
      }
    } catch {
      return;
    }

    setIsTxSending(true);
    let txHashForTracking: string | null = null;

    try {
      const client = await SigningStargateClient.connectWithSigner(
        chainInfo.rpc,
        offlineSigner,
      );

      const fee = {
        amount: [{ denom: "uosmo", amount: "1000" }],
        gas: "200000",
      };

      const result = await client.sendTokens(
        bech32Address,
        recipientAddress,
        [{ denom: "uosmo", amount }],
        fee,
      );

      txHashForTracking = result.transactionHash;
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

    const clientQuery = await StargateClient.connect(chainInfo.rpc);
    const interval = setInterval(async () => {
      try {
        const receipt = await clientQuery.getTx(txHashForTracking!);
        if (receipt) {
          clearInterval(interval);
          setTxStatus(receipt.code === 0 ? "confirmed" : "failed");
          await queryClient.invalidateQueries({
            queryKey: ["cosmos-balance", bech32Address],
            exact: true,
          });
        }
      } catch {
        // keep polling
      }
    }, 2000);
  }

  function resetForm() {
    reset();
    setTxHash("");
    setTxStatus("pending");
  }

  return (
    <div className="bg-widget border border-widget-border rounded-3xl p-6 shadow-xl">
      {!txHash ? (
        <TxForm
          title="Cosmos Transfer (uosmo)"
          recipientPlaceholder="osmo..."
          amountPlaceholder="0"
          register={register}
          errors={errors}
          onSubmit={handleSubmit(handleSend)}
          canSend={!!bech32Address && isValid && !isTxSending}
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
