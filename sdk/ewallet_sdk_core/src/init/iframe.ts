import { type Result } from "@keplr-ewallet/stdlib-js";

export function setupIframeElement(
  url: string,
): Result<HTMLIFrameElement, string> {
  const bodyEls = document.getElementsByTagName("body");
  if (bodyEls[0] === undefined) {
    console.error("body element not found");
    return {
      success: false,
      err: "body element not found",
    };
  }

  const bodyEl = bodyEls[0];

  console.debug("[keplr] appending iframe");

  // iframe setup
  const iframe = document.createElement("iframe");
  iframe.src = url;

  // iframe style
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "100vw";
  iframe.style.height = "100vh";
  iframe.style.border = "none";
  iframe.style.display = "none";
  iframe.style.backgroundColor = "transparent";
  iframe.style.overflow = "hidden";
  iframe.style.zIndex = "1000000";

  // iframe.setAttribute(
  //   "sandbox",
  //   "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox",
  // );

  // attach
  bodyEl.appendChild(iframe);

  return { success: true, data: iframe };
}
