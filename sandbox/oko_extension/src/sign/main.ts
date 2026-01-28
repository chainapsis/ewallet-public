/**
 * Sign page - Redirects to oko_attached for signing
 * Opens oko_attached directly with modal parameters in the URL
 */

import { OKO_ATTACHED_URL } from "@/shared/constants";

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const requestId = urlParams.get("requestId");
const encodedPayload = urlParams.get("payload");

async function init(): Promise<void> {
  if (!requestId || !encodedPayload) {
    document.getElementById("loading")!.innerHTML = "Error: Missing parameters";
    return;
  }

  let payload;
  try {
    payload = JSON.parse(decodeURIComponent(encodedPayload));
  } catch {
    document.getElementById("loading")!.innerHTML = "Error: Invalid payload";
    return;
  }

  const extensionOrigin = chrome.runtime.getURL("").slice(0, -1);

  // Build oko_attached URL with modal parameters
  const okoUrl = new URL(OKO_ATTACHED_URL);
  okoUrl.searchParams.set("host_origin", extensionOrigin);
  okoUrl.searchParams.set("modal", "true");
  okoUrl.searchParams.set("requestId", requestId);
  okoUrl.searchParams.set("payload", encodeURIComponent(JSON.stringify(payload)));

  window.location.href = okoUrl.toString();
}

// Start initialization
init();
