"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";

import { OkoEvmProvider } from "./OkoEvmProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

const queryClient = new QueryClient();

export default function Providers({ children }: ProvidersProps) {
  return (
    <OkoEvmProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </OkoEvmProvider>
  );
}
