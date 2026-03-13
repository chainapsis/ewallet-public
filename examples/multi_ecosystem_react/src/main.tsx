import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Buffer as NodeBuffer } from "buffer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App";

// NOTE: Ensure Buffer is available for SDKs that rely on Node's Buffer in browser
(globalThis as any).Buffer = (globalThis as any).Buffer || NodeBuffer;

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
