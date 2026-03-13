import { createFileRoute } from "@tanstack/react-router";

import { AttachedInitialized } from "@oko-wallet-attached/components/attached_initialized/attached_initialized";
import { Home } from "@oko-wallet-attached/components/home/home";

export const Route = createFileRoute("/")({
  component: Component,
});

function Component() {
  return (
    <AttachedInitialized>
      <Home />
    </AttachedInitialized>
  );
}
