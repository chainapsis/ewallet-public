import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import { Home } from "@/components/home/home";

import "@/styles/globals.scss";

const queryClient = new QueryClient();

async function main() {
  const root = document.getElementById("root");

  if (root === null) {
    console.error("[attached] root elem not found");
    return;
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

main().then();
