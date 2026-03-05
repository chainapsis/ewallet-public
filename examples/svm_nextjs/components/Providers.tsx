"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
