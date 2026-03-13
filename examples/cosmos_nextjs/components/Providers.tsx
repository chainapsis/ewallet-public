"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";

import { OkoCosmosProvider } from "./OkoCosmosProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

const queryClient = new QueryClient();

export default function Providers({ children }: ProvidersProps) {
  return (
    <OkoCosmosProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </OkoCosmosProvider>
  );
}
