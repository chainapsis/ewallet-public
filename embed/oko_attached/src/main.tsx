import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import "@fontsource-variable/inter";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";

import "@oko-wallet-attached/styles/global.scss";

import { routeTree } from "./routeTree.gen";
import { initAmplitude } from "@oko-wallet-attached/analytics/amplitude";

// Initialize Amplitude
initAmplitude();

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultStaleTime: 5000,
  scrollRestoration: true,
});

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootEl = document.getElementById("root");

if (!rootEl) {
  console.error("root element not found");

  process.exit(1);
}

if (!rootEl.innerHTML) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    // StrictMode is disabled because it causes double sign-up or sign-in
    // <StrictMode>
    <RouterProvider router={router} />,
    // </StrictMode>,
  );
}
