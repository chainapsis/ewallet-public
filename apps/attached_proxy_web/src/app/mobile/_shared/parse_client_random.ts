/**
 * Parse client_random from the URL fragment.
 * The value is placed in the fragment (not query params) to avoid
 * exposure in server logs and browser history.
 */
export function parseClientRandomFromHash(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) {
    return null;
  }
  const params = new URLSearchParams(hash);
  return params.get("client_random");
}
