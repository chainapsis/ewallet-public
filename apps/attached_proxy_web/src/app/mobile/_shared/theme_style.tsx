/**
 * Inline <style> for mobile proxy pages.
 *
 * Uses CSS prefers-color-scheme so the correct colors are painted on
 * first render — no JS needed, no flash of wrong theme.
 */
export function ProxyThemeStyle() {
  return (
    <style>
      {`body { background: #f5f5f5; color: #535862; }
        @media (prefers-color-scheme: dark) {
          body { background: #0c0e12; color: #94979c; }
        }`}
    </style>
  );
}
