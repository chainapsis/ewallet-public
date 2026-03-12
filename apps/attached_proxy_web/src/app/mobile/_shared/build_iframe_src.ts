/**
 * Build the iframe src for the attached wallet.
 * Uses a relative path so the proxy's catch-all route forwards to upstream.
 */
export function buildIframeSrc(hostOrigin: string, apiKey: string): string {
  const params = new URLSearchParams();
  if (hostOrigin) {
    params.set("host_origin", hostOrigin);
  }
  if (apiKey) {
    params.set("api_key", apiKey);
  }
  params.set("mobile", "true");
  return `/?${params.toString()}`;
}
