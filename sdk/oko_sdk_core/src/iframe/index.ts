import type { Result } from "@oko-wallet/stdlib-js";

export const OKO_IFRAME_ID = "oko-attached";

export function setUpIframeElement(
  url: URL,
): Result<HTMLIFrameElement, string> {
  const oldEl = document.getElementById(OKO_IFRAME_ID);
  if (oldEl !== null) {
    console.warn("[oko] iframe already exists");

    return {
      success: true,
      data: oldEl as HTMLIFrameElement,
    };
  }

  const bodyEls = document.getElementsByTagName("body");
  if (bodyEls.length < 1 || bodyEls[0] === undefined) {
    console.error("body element not found");
    return {
      success: false,
      err: "body element not found",
    };
  }

  const bodyEl = bodyEls[0];

  console.debug("[oko] setting up iframe");

  const iframe = document.createElement("iframe");

  if (document.readyState === "complete") {
    loadIframe(iframe, bodyEl, url);
  } else {
    window.addEventListener("load", () => loadIframe(iframe, bodyEl, url));
  }

  return { success: true, data: iframe };
}

function loadIframe(
  iframe: HTMLIFrameElement,
  bodyEl: HTMLBodyElement,
  url: URL,
) {
  console.log("[oko] loading iframe");

  iframe.src = url.toString();

  // NOTE: If not loading at the startup, there is no way to initialize the app
  // since its visibility is hidden from the viewport.
  iframe.loading = "eager";

  // iframe style
  iframe.id = OKO_IFRAME_ID;
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
  iframe.style.pointerEvents = "auto";

  // NOTE: @retto
  // Applying a 'color-scheme' to the body of an iframe causes a bug
  // where, if the host site doesn't have a color-scheme and the browser's
  // default is dark, the background changes to black.
  // Therefore, we force a light mode in the iframe
  iframe.style.colorScheme = "light";

  bodyEl.appendChild(iframe);
}
