"use client";

import { Toast, type ToastVariant } from "@oko-wallet/oko-common-ui/toast";
import type { FC } from "react";
import { type ExternalToast, Toaster, toast } from "sonner";

export function displayToast({
  variant,
  title,
  description,
  toastOptions,
}: {
  variant: ToastVariant;
  title: string;
  description?: string;
  toastOptions?: ExternalToast;
}) {
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
      ...toastOptions,
    },
  );
}

export const ToastContainer: FC<{ stacked?: boolean }> = ({
  stacked = true,
}) => {
  return (
    <Toaster
      position="top-right"
      expand={!stacked}
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
