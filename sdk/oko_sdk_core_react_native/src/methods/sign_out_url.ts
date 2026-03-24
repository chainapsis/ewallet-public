export function buildSignOutUrl(
  sdkEndpoint: string,
  redirectScheme: string,
  clientRandom?: string | null,
): string {
  const url = new URL("/mobile/sign-out", sdkEndpoint);
  url.searchParams.set("host_origin", sdkEndpoint);
  url.searchParams.set("redirect_scheme", redirectScheme);
  if (clientRandom) {
    url.hash = `client_random=${encodeURIComponent(clientRandom)}`;
  }
  return url.toString();
}
