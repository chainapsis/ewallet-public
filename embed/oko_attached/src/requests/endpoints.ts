export const KEPLR_API_ENDPOINT = import.meta.env.VITE_KEPLR_API_ENDPOINT;

export const TX_INTERPRETER_API_ENDPOINT = import.meta.env
  .VITE_TX_INTERPRETER_API_ENDPOINT;

export const DEMO_WEB_ORIGIN = import.meta.env.VITE_DEMO_WEB_ORIGIN;

/**
 * Check if the origin is a demo or sandbox context.
 * - Matches the configured DEMO_WEB_ORIGIN
 * - Treats non-http(s) origins (e.g. native app custom schemes like `myapp://`)
 *   as sandbox contexts where balance checks should be skipped.
 *
 * When the request flows through attached_proxy_web, the original app origin
 * (e.g. `myapp://`) is replaced with the proxy's https origin for wallet
 * storage purposes.  The original is preserved as `appOrigin` so we can still
 * detect native-app sandbox contexts here.
 */
export function isDemoOrSandboxOrigin(
  hostOrigin: string,
  appOrigin?: string,
): boolean {
  const origins = appOrigin ? [appOrigin, hostOrigin] : [hostOrigin];
  for (const origin of origins) {
    if (origin === DEMO_WEB_ORIGIN) {
      return true;
    }
    if (
      origin !== "" &&
      !origin.startsWith("http://") &&
      !origin.startsWith("https://")
    ) {
      return true;
    }
  }
  return false;
}

export const OKO_API_ENDPOINT = import.meta.env.VITE_OKO_API_ENDPOINT;

export const OKO_PUBLIC_S3_BUCKET_URL = import.meta.env
  .VITE_PUBLIC_S3_BUCKET_URL;

export const USER_DASHBOARD_ORIGINS = import.meta.env
  .VITE_USER_DASHBOARD_ORIGINS;
