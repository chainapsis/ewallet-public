"use client";

import { Button } from "@oko-wallet/oko-common-ui/button";
import { Input } from "@oko-wallet/oko-common-ui/input";
import type { KeyShareNode } from "@oko-wallet/oko-types/tss";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import type { SubmitHandler } from "react-hook-form";

import styles from "./create_customer_form.module.scss";
import {
  type CreateKSNodeFormData,
  useCreateKSNodeForm,
} from "./use_create_ks_node_form";
import { useToast } from "@oko-wallet-admin/components/toast/use_toast";
import { getKSNodeById } from "@oko-wallet-admin/fetch/ks_node";
import { useAppState } from "@oko-wallet-admin/state";

interface CreateKSNodeFormProps {
  mode?: CreateOrEditKSNodeProps["mode"];
  nodeId?: CreateOrEditKSNodeProps["nodeId"];
}

function useGetKSNodeInfo(nodeId?: string) {
  const { token } = useAppState();

  const query = useQuery<KeyShareNode>({
    queryKey: ["ks-node", nodeId],
    queryFn: async () => {
      if (!nodeId || !token) {
        throw new Error("Node ID is not found");
      }

      const response = await getKSNodeById({ token, node_id: nodeId });
      if (!response.success) {
        throw new Error(response.msg ?? "Failed to get keyshare node.");
      }

      return response.data.ksNode;
    },
    enabled: !!nodeId && !!token,
  });

  return { ...query, data: query.data };
}

export const CreateKSNodeForm: FC<CreateKSNodeFormProps> = ({
  mode = "create",
  nodeId,
}) => {
  const router = useRouter();
  const { showSuccessToast, showErrorToast } = useToast();
  const nodeInfo = useGetKSNodeInfo(nodeId).data;
  const { mutation, errors, handleSubmit, register } = useCreateKSNodeForm(
    nodeInfo,
    nodeId,
  );

  const onSubmit: SubmitHandler<CreateKSNodeFormData> = (data) => {
    mutation.mutate(data, {
      onSuccess: (data) => {
        if (data?.success) {
          const message =
            mode === "edit"
              ? "Successfully updated keyshare node."
              : "Successfully created keyshare node.";
          showSuccessToast(message);
          router.push("/keyshare_nodes");
        }
      },
      onError: (err) => {
        showErrorToast(err.message);
      },
    });
  };

  return (
    /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
    <form className={styles.wrapper} onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register("node_name")}
        requiredSymbol
        label="Node Name"
        placeholder="Enter key share node name"
        disabled={mode === "edit"}
        className={styles.inputCustomWidth}
        error={errors.node_name?.message}
      />

      <Input
        {...register("server_url")}
        requiredSymbol
        label="Node URL"
        placeholder="https://example.com"
        className={styles.inputCustomWidth}
        error={errors.server_url?.message}
      />

      <Button type="submit" disabled={mutation.isPending}>
        {mode === "edit" ? "Update Node" : "Add Node"}
      </Button>
    </form>
  );
};
