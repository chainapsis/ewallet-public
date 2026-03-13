export function getFaviconUrl(origin: string): string {
  if (!origin) {
    return "";
  }

  try {
    const parsed = new URL(origin);
    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
      parsed.origin,
    )}`;
  } catch (_error) {
    return "";
  }
}
