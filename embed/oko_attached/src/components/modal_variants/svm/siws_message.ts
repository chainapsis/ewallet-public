/**
 * SIWS (Sign In With Solana) message parsing and verification
 * Following EIP-4361 format adapted for Solana
 * https://eips.ethereum.org/EIPS/eip-4361
 */

import { verifySignInOrigin } from "@oko-wallet-attached/components/modal_variants/common/sign_in_message";

export interface SiwsMessage {
  domain: string;
  address: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

/**
 * Parse a SIWS message string into a structured object
 * Message format:
 * ```
 * ${domain} wants you to sign in with your Solana account:
 * ${address}
 *
 * ${statement}
 *
 * URI: ${uri}
 * Version: ${version}
 * Chain ID: ${chainId}
 * Nonce: ${nonce}
 * Issued At: ${issuedAt}
 * Expiration Time: ${expirationTime}
 * Not Before: ${notBefore}
 * Request ID: ${requestId}
 * Resources:
 * - ${resource1}
 * - ${resource2}
 * ```
 */
export function parseSiwsMessage(message: string): Partial<SiwsMessage> {
  const result: Partial<SiwsMessage> = {};
  const lines = message.split("\n");

  if (lines.length < 2) {
    return result;
  }

  // First line: "${domain} wants you to sign in with your Solana account:"
  const firstLineMatch = lines[0].match(
    /^(.+?) wants you to sign in with your Solana account:$/,
  );
  if (firstLineMatch) {
    result.domain = firstLineMatch[1];
  }

  // Second line: address
  if (lines[1] && lines[1].trim()) {
    result.address = lines[1].trim();
  }

  // Find the separator between header and fields
  let statementLines: string[] = [];
  let fieldStartIndex = -1;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line starts a field
    if (
      line.startsWith("URI:") ||
      line.startsWith("Version:") ||
      line.startsWith("Chain ID:") ||
      line.startsWith("Nonce:") ||
      line.startsWith("Issued At:") ||
      line.startsWith("Expiration Time:") ||
      line.startsWith("Not Before:") ||
      line.startsWith("Request ID:") ||
      line.startsWith("Resources:")
    ) {
      fieldStartIndex = i;
      break;
    }

    // Collect statement lines (skip empty lines at the beginning)
    if (line.trim() || statementLines.length > 0) {
      statementLines.push(line);
    }
  }

  // Clean up statement (remove trailing empty lines)
  while (
    statementLines.length > 0 &&
    !statementLines[statementLines.length - 1].trim()
  ) {
    statementLines.pop();
  }
  while (statementLines.length > 0 && !statementLines[0].trim()) {
    statementLines.shift();
  }

  if (statementLines.length > 0) {
    result.statement = statementLines.join("\n");
  }

  // Parse fields
  if (fieldStartIndex !== -1) {
    let inResources = false;
    const resources: string[] = [];

    for (let i = fieldStartIndex; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("Resources:")) {
        inResources = true;
        continue;
      }

      if (inResources) {
        if (line.startsWith("- ")) {
          resources.push(line.slice(2));
        }
        continue;
      }

      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      switch (key) {
        case "URI":
          result.uri = value;
          break;
        case "Version":
          result.version = value;
          break;
        case "Chain ID":
          result.chainId = value;
          break;
        case "Nonce":
          result.nonce = value;
          break;
        case "Issued At":
          result.issuedAt = value;
          break;
        case "Expiration Time":
          result.expirationTime = value;
          break;
        case "Not Before":
          result.notBefore = value;
          break;
        case "Request ID":
          result.requestId = value;
          break;
      }
    }

    if (resources.length > 0) {
      result.resources = resources;
    }
  }

  return result;
}

/**
 * Check if a message is a valid SIWS message
 * Returns the parsed message if valid, undefined otherwise
 */
export function getSiwsMessage(
  message: Uint8Array | string,
): SiwsMessage | undefined {
  let messageStr: string;

  if (message instanceof Uint8Array) {
    try {
      messageStr = new TextDecoder().decode(message);
    } catch {
      return undefined;
    }
  } else {
    messageStr = message;
  }

  const siwsMsg = parseSiwsMessage(messageStr);

  // Validate required fields for SIWS
  // Address should be a valid Solana base58 address (32-44 characters)
  const isValidSolanaAddress =
    siwsMsg.address && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(siwsMsg.address);

  if (siwsMsg.domain && isValidSolanaAddress) {
    return siwsMsg as SiwsMessage;
  }

  return undefined;
}

/**
 * Verify that the SIWS message matches the origin
 */
export function verifySiwsMessage(
  message: SiwsMessage,
  origin: string,
): boolean {
  return verifySignInOrigin(message.domain, message.uri, origin);
}
