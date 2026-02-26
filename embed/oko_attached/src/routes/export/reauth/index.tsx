import { createFileRoute } from "@tanstack/react-router";

import { ExportReauth } from "@oko-wallet-attached/components/export/export_reauth";

export const Route = createFileRoute("/export/reauth/")({
  component: ExportReauth,
});
