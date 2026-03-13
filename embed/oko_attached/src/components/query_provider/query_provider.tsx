"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { FC, PropsWithChildren } from "react";

import { queryClient } from "@oko-wallet-attached/config/react_query";

export const QueryProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
