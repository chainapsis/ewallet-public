"use client";

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { FC, PropsWithChildren } from "react";

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
        {children}
      </HydrationBoundary>
    </QueryClientProvider>
  );
};
