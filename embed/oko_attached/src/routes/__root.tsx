import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";

import { QueryProvider } from "@oko-wallet-attached/components/query_provider/query_provider";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div>
        <p>Not found</p>
      </div>
    );
  },
});

function RootComponent() {
  return (
    <>
      <QueryProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <Outlet />
        </Suspense>
      </QueryProvider>
      {/* <TanStackRouterDevtools position="bottom-right" /> */}
    </>
  );
}
