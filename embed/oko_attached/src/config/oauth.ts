export const GOOGLE_CLIENT_ID =
  "421793224165-cpmbt6enqrj6ad6n4ujokham8qdmnnln.apps.googleusercontent.com";
export const X_CLIENT_ID = "eWJPdVNYNlV6dEpNSTM3T01GRGI6MTpjaQ";
export const DISCORD_CLIENT_ID = "1445280712121913384";
export const GITHUB_CLIENT_ID = "Iv23limwRjerP82VKFmp";

export { TELEGRAM_CLIENT_ID } from "./telegram";

export function generateNonce(length = 8): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRandomString(length = 64): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let binary = "";
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }

  const base64 = btoa(binary);
  return base64.replace(/[+/]|(=+)$/g, (match) => {
    if (match === "+") {
      return "-";
    }
    if (match === "/") {
      return "_";
    }
    return "";
  });
}

async function sha256(input: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  return crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/[+/]|(=+)$/g, (match) => {
    if (match === "+") {
      return "-";
    }
    if (match === "/") {
      return "_";
    }
    return "";
  });
}

export async function createPkcePair(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(64);
  const hash = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(hash);
  return { codeVerifier, codeChallenge };
}
