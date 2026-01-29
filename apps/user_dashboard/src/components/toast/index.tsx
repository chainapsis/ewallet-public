"use client";

import {
  Toast,
  ToastCloseButton,
  type ToastVariant,
} from "@oko-wallet/oko-common-ui/toast";
import type { FC } from "react";
import {
  Bounce,
  ToastContainer as ReactToastifyToastContainer,
  type ToastOptions,
  toast,
} from "react-toastify";

export function displayToast({
  variant,
  title,
  description,
  toastOptions,
}: {
  variant: ToastVariant;
  title: string;
  description?: string;
  toastOptions?: Partial<ToastOptions>;
}) {
  toastOptions = {
    ...{
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: false,
      progress: undefined,
      pauseOnFocusLoss: false,
    },
    ...(toastOptions ?? {}),
  };

  toast(
    <Toast title={title} description={description} variant={variant} />,
    toastOptions,
  );
}

export const ToastContainer: FC = () => {
  return (
    <ReactToastifyToastContainer
      stacked
      transition={Bounce}
      toastClassName="custom-toast"
      closeButton={(props) => (
        <ToastCloseButton closeToast={props.closeToast} />
      )}
    />
  );
};
