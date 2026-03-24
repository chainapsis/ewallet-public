const ATTACHED_ORIGIN =
  (import.meta as ImportMeta & { env?: { VITE_ATTACHED_ORIGIN?: string } }).env
    ?.VITE_ATTACHED_ORIGIN ?? "https://attached.oko.app";

/**
 * Build the iframe src for the attached wallet.
 * Uses the attached origin directly so the iframe runs cross-origin,
 * matching the web SDK's behavior.
 */
export function buildIframeSrc(
  hostOrigin: string,
  apiKey: string,
  clientRandom?: string,
): string {
  const url = new URL("/", ATTACHED_ORIGIN);
  if (hostOrigin) {
    url.searchParams.set("host_origin", hostOrigin);
  }
  if (apiKey) {
    url.searchParams.set("api_key", apiKey);
  }
  url.searchParams.set("mobile_native", "true");
  if (clientRandom) {
    url.searchParams.set("client_random", clientRandom);
  }
  return url.toString();
}

export { ATTACHED_ORIGIN };
