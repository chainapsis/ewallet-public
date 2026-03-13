"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";

import { OkoSvmProvider } from "./OkoSvmProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

const queryClient = new QueryClient();

export default function Providers({ children }: ProvidersProps) {
  return (
    <OkoSvmProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </OkoSvmProvider>
  );
}
