import { useEffect, useState } from "react";

import type { AuthType } from "@oko-wallet/oko-types/auth";

import { useExportReauth } from "./use_export_reauth";

type ReauthStatus = "loading" | "redirecting" | "error";

/**
 * Re-auth popup dispatcher.
 * Reads `auth_type` from URL search params and dispatches to the appropriate flow:
 * - google / x / discord → immediate OAuth redirect via useExportReauth hook
 * - auth0 / telegram → dedicated UI component (Phase 7)
 */
export function ExportReauth() {
  const params = new URLSearchParams(window.location.search);
  const authType = params.get("auth_type") as AuthType | null;

  if (!authType) {
    return <div>Error: auth_type parameter is required</div>;
  }

  switch (authType) {
    case "google":
    case "x":
    case "discord":
      return <OAuthRedirect authType={authType} />;

    case "auth0":
      // Phase 7: EmailReauth component
      return <div>Email re-authentication (coming soon)</div>;

    case "telegram":
      // Phase 7: TelegramReauth component
      return <div>Telegram re-authentication (coming soon)</div>;

    default:
      return <div>Error: unsupported auth_type: {authType}</div>;
  }
}

function OAuthRedirect({ authType }: { authType: "google" | "x" | "discord" }) {
  const [status, setStatus] = useState<ReauthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const { startReauth } = useExportReauth();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await startReauth(authType);

      if (cancelled) {
        return;
      }

      if (!result.success) {
        setStatus("error");
        setError(result.err);
        return;
      }

      setStatus("redirecting");
      // window.location.href is set inside startReauth — page will navigate away
    })();

    return () => {
      cancelled = true;
    };
  }, [authType, startReauth]);

  if (status === "error") {
    return <div>Error: {error}</div>;
  }

  return <div>Redirecting to {authType} authentication...</div>;
}
