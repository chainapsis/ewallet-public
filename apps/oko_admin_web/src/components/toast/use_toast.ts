import { useContext } from "react";

import { ToastContext } from "@oko-wallet-admin/components/toast/toastProvider";

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
};
