import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import { Home } from "@/components/home/home";

import "@/styles/globals.scss";
import { StrictMode } from "react";

const queryClient = new QueryClient();

async function main() {
  const root = document.getElementById("root");

  if (root === null) {
    console.error("[attached] root elem not found");
    return;
  }

  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

main().then();
