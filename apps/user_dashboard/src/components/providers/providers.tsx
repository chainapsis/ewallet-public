"use client";

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { FC, PropsWithChildren } from "react";

import { OkoProvider } from "@oko-wallet-user-dashboard/components/oko_provider/oko_provider";

function makeTanStackQueryClient() {
  // Create a client
  const queryClient = new QueryClient();
  return queryClient;
}

const queryClient = makeTanStackQueryClient();

export const Providers: FC<PropsWithChildren> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <OkoProvider>{children}</OkoProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
};
