import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@oko-wallet-admin/components/toast/use_toast";
import { setTssAllActivationSetting } from "@oko-wallet-admin/fetch/tss";
import { useAppState } from "@oko-wallet-admin/state";

export function useToggleTssAllActivation() {
  const { token } = useAppState();
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useToast();

  const mutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      if (!token) {
        throw new Error("No token available");
      }

      const response = await setTssAllActivationSetting({
        token,
        is_enabled: isEnabled,
      });

      if (!response.success) {
        throw new Error(
          response.msg || "Failed to update TSS activation setting",
        );
      }

      return {
        success: true,
        data: response.data,
      };
    },
    onSuccess: (data) => {
      showSuccessToast(
        `TSS features ${data.data?.tss_activation_setting.is_enabled ? "activated" : "deactivated"} successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ["tss-activation-setting"] });
    },
    onError: (error: Error) => {
      showErrorToast(
        error.message || "Failed to update TSS activation setting",
      );
    },
  });

  return mutation;
}
