import { createFileRoute } from "@tanstack/react-router";

import { ExportDisplay } from "@oko-wallet-attached/components/export/export_display";

export const Route = createFileRoute("/export/display/")({
  component: ExportDisplay,
});
