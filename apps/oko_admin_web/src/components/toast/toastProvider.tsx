import { createContext, type FC, useState } from "react";

import { Toast, type ToastType } from "./toast";

type ToastContextType = {
  showSuccessToast: (msg: string) => void;
  showErrorToast: (msg: string) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined,
);

export const ToastProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [message, setMessage] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  const showToast = (msg: string, type: ToastType) => {
    setMessage({ message: msg, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const showSuccessToast = (msg: string) => {
    showToast(msg, "success");
  };

  const showErrorToast = (msg: string) => {
    showToast(msg, "error");
  };

  return (
    <ToastContext.Provider value={{ showSuccessToast, showErrorToast }}>
      {children}
      {message && (
        <Toast
          message={message.message}
          type={message.type}
          onClose={() => setMessage(null)}
        />
      )}
    </ToastContext.Provider>
  );
};
