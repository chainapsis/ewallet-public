export function removeLastSlashIfIs(str: string): string {
  if (str.length > 0 && str[str.length - 1] === "/") {
    return str.slice(0, str.length - 1);
  }

  return str;
}

/**
 * Converts IPFS URLs to use a custom gateway URL if configured.
 *
 * Handles the following URL formats:
 * - `ipfs://` protocol → gateway URL
 * - `ipfs.io` domain → custom gateway
 * - Other IPFS gateway URLs → custom gateway
 *
 * If `VITE_IPFS_GATEWAY_URL` is not set, returns the original URL unchanged.
 *
 * @param url - The URL to convert
 * @returns The converted URL or the original URL if no gateway is configured
 */
export function convertIpfsUrl(url: string): string {
  const gatewayUrl = import.meta.env.VITE_IPFS_GATEWAY_URL;

  if (!gatewayUrl || gatewayUrl.trim() === "") {
    return url;
  }

  const cleanGatewayUrl = removeLastSlashIfIs(gatewayUrl.trim());

  if (url.startsWith("ipfs://")) {
    const hash = url.substring(7);
    return `${cleanGatewayUrl}/ipfs/${hash}`;
  }

  if (url.includes("ipfs.io/ipfs/")) {
    const match = url.match(/ipfs\.io\/ipfs\/(.+)/);
    if (match?.[1]) {
      return `${cleanGatewayUrl}/ipfs/${match[1]}`;
    }
  }

  if (url.includes("/ipfs/")) {
    const match = url.match(/\/ipfs\/(.+)/);
    if (match?.[1]) {
      return `${cleanGatewayUrl}/ipfs/${match[1]}`;
    }
  }

  return url;
}
