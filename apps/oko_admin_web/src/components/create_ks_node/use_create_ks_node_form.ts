import type { CreateKSNodeResponse } from "@oko-wallet/oko-types/admin";
import type { OkoApiSuccessResponse } from "@oko-wallet/oko-types/api_response";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import {
  createKeyShareNode,
  updateKeyShareNode,
} from "@oko-wallet-admin/fetch/ks_node";
import { useAppState } from "@oko-wallet-admin/state";
import { isValidUrl } from "@oko-wallet-admin/utils/";

export interface CreateKSNodeFormData {
  node_name: string;
  server_url: string;
}

export function useCreateKSNodeForm(
  initialData?: CreateKSNodeFormData,
  nodeId?: string,
) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    reset,
  } = useForm<CreateKSNodeFormData>();

  useEffect(() => {
    if (initialData) {
      reset({
        node_name: initialData.node_name,
        server_url: initialData.server_url,
      });
    }
  }, [initialData, reset]);

  const { token } = useAppState();

  const mutation = useMutation<
    OkoApiSuccessResponse<CreateKSNodeResponse> | undefined,
    any,
    CreateKSNodeFormData
  >({
    mutationFn: async (data) => {
      if (!token) {
        throw new Error("Please log in to continue.");
      }

      if (!data.node_name || data.node_name.trim().length === 0) {
        setError("node_name", {
          message: "KeyShare Node name is required.",
        });
        return;
      }

      if (data.node_name.trim().length < 3) {
        setError("node_name", {
          message: "KeyShare Node name must be at least 3 characters long.",
        });
        return;
      }

      // Server URL validation
      if (!data.server_url || data.server_url.trim().length === 0) {
        setError("server_url", {
          message: "Server URL is required.",
        });
        return;
      }

      // Add https:// prefix if missing
      let processedUrl = data.server_url.trim();

      const re = /^(https?:\/\/)/i;
      if (re.test(processedUrl) === false) {
        processedUrl = `https://${processedUrl}`;
      }

      if (!isValidUrl(processedUrl)) {
        console.log("processedUrl", processedUrl);
        setError("server_url", {
          message: "Server URL format is invalid.",
        });
        return;
      }

      // Check for validation errors
      if (Object.keys(errors).length > 0) {
        return;
      }

      const isEdit =
        initialData?.node_name !== undefined &&
        initialData.node_name.length > 0 &&
        nodeId;
      if (isEdit) {
        const response = await updateKeyShareNode({
          token,
          node_id: nodeId,
          server_url: processedUrl,
        });

        if (!response.success) {
          throw new Error(response.msg ?? "Failed to update keyshare node.");
        }
        return {
          success: true,
          data: response.data,
        };
      } else {
        // Create ks node
        const response = await createKeyShareNode({
          token,
          node_name: data.node_name.trim(),
          server_url: processedUrl,
        });

        if (!response.success) {
          throw new Error(response.msg ?? "Failed to create keyshare node.");
        }
        return {
          success: true,
          data: response.data,
        };
      }
    },
  });

  return {
    mutation,
    errors,
    handleSubmit,
    register,
  };
}
