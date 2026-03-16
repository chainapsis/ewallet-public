"use client";

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { FC, PropsWithChildren } from "react";

import { OkoProvider } from "@oko-wallet-user-dashboard/components/oko_provider/oko_provider";

function makeTanStackQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return queryClient;
}

const queryClient = makeTanStackQueryClient();

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
});

export const Providers: FC<PropsWithChildren> = ({ children }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.queryKey[0] === "balances",
        },
      }}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <OkoProvider>{children}</OkoProvider>
      </HydrationBoundary>
    </PersistQueryClientProvider>
  );
};
