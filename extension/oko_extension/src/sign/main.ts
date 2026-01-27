/**
 * Sign page - Redirects to oko_attached for signing
 * Opens oko_attached directly with modal parameters in the URL
 */

import { OKO_ATTACHED_URL } from "@/shared/constants";

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const requestId = urlParams.get("requestId");
const encodedPayload = urlParams.get("payload");

console.log("[oko-sign] Sign page loaded", { requestId, OKO_ATTACHED_URL });

async function init(): Promise<void> {
  if (!requestId || !encodedPayload) {
    console.error("[oko-sign] Missing signing parameters");
    document.getElementById("loading")!.innerHTML = "Error: Missing parameters";
    return;
  }

  let payload;
  try {
    payload = JSON.parse(decodeURIComponent(encodedPayload));
    console.log("[oko-sign] Parsed payload:", payload);
  } catch (e) {
    console.error("[oko-sign] Invalid payload");
    document.getElementById("loading")!.innerHTML = "Error: Invalid payload";
    return;
  }

  // Get extension origin for host_origin parameter
  const extensionOrigin = chrome.runtime.getURL("").slice(0, -1);

  // Build oko_attached URL with modal parameters
  // Note: content script expects payload to be encodeURIComponent(JSON) which it then
  // JSON.parse(decodeURIComponent(...)). Using searchParams.set auto-encodes, so we pass
  // the JSON string directly and let searchParams handle the encoding.
  const okoUrl = new URL(OKO_ATTACHED_URL);
  okoUrl.searchParams.set("host_origin", extensionOrigin);
  okoUrl.searchParams.set("modal", "true");
  okoUrl.searchParams.set("requestId", requestId);
  // Double-encode: encodeURIComponent the JSON, then searchParams will encode again
  // Content script does: JSON.parse(decodeURIComponent(urlParams.get("payload")))
  // After urlParams.get (which decodes once), we need the value to still be URL-encoded
  okoUrl.searchParams.set("payload", encodeURIComponent(JSON.stringify(payload)));

  console.log("[oko-sign] Redirecting to oko_attached:", okoUrl.toString());

  // Redirect to oko_attached
  window.location.href = okoUrl.toString();
}

// Start initialization
init();
