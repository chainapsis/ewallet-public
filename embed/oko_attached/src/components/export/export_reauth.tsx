import { useEffect, useLayoutEffect, useState } from "react";

import { ThemeProvider } from "@oko-wallet/oko-common-ui/theme";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { setColorScheme } from "@oko-wallet-attached/components/attached_initialized/color_scheme";
import { getSystemTheme } from "@oko-wallet-attached/components/google_callback/theme";
import { EmailReauth } from "./email_reauth";
import { TelegramReauth } from "./telegram_reauth";
import { useExportReauth } from "./use_export_reauth";

type ReauthStatus = "loading" | "redirecting" | "error";

export const ExportReauth = () => {
  const theme = getSystemTheme();

  useLayoutEffect(() => {
    setColorScheme(theme);
  }, [theme]);

  const params = new URLSearchParams(window.location.search);
  const authType = params.get("auth_type") as AuthType | null;

  if (!authType) {
    return <div>Error: auth_type parameter is required</div>;
  }

  const content = (() => {
    switch (authType) {
      case "google":
      case "x":
      case "discord":
        return <OAuthRedirect authType={authType} />;

      case "auth0":
        return <EmailReauth />;

      case "telegram":
        return <TelegramReauth />;

      default:
        return <div>Error: unsupported auth_type: {authType}</div>;
    }
  })();

  return <ThemeProvider theme={theme}>{content}</ThemeProvider>;
}

const OAuthRedirect = ({ authType }: { authType: "google" | "x" | "discord" }) => {
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

  return null;
}
