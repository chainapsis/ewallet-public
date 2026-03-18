"use client";

import { Toast, type ToastVariant } from "@oko-wallet/oko-common-ui/toast";
import type { FC } from "react";
import { type ExternalToast, Toaster, toast } from "sonner";

interface DisplayToastProps {
  variant: ToastVariant;
  title: string;
  description?: string;
  toastOptions?: ExternalToast;
}

export function displayToast({
  variant,
  title,
  description,
  toastOptions,
}: DisplayToastProps) {
  toast.custom(
    (id) => (
      <Toast
        title={title}
        description={description}
        variant={variant}
        onClose={() => toast.dismiss(id)}
      />
    ),
    {
      duration: 5000,
      position: "top-right",
      ...toastOptions,
    },
  );
}

export const ToastContainer: FC = () => {
  return (
    <Toaster
      expand={false}
      visibleToasts={5}
      style={{ "--width": "320px" } as React.CSSProperties}
      toastOptions={{
        style: {
          padding: 0,
          margin: 0,
          background: "transparent",
          border: "none",
          boxShadow: "none",
          width: "var(--width)",
        },
      }}
    />
  );
};
