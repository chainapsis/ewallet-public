"use client";

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { FC, PropsWithChildren } from "react";
import { IntlProvider } from "react-intl";

import { ToastProvider } from "@oko-wallet-admin/components/toast/toastProvider";
import { en } from "@oko-wallet-admin/i18n/en";

const queryClient = new QueryClient();

export const TopProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <IntlProvider messages={en} locale="en" defaultLocale="en">
          <ToastProvider>{children}</ToastProvider>
        </IntlProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
};
