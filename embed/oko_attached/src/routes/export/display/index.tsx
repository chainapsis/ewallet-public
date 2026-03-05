import { createFileRoute } from "@tanstack/react-router";

import { ExportDisplay } from "@oko-wallet-attached/components/export/export_display";

console.log("[attached][route] /export/display/ route module loaded");

export const Route = createFileRoute("/export/display/")({
  component: ExportDisplay,
});
