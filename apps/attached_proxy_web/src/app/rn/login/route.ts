import { type NextRequest, NextResponse } from "next/server";

import { createSession } from "../../../relay/session_store";

const COOKIE_NAME = "oko_rn_session";

function sessionCookie(sessionId: string): string {
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`;
}

/**
 * OS-browser login entry page (raw HTML route handler).
 *
 * Opened via expo-web-browser's openAuthSessionAsync.
 * Creates a server session (sets HttpOnly cookie) and returns a standalone
 * HTML page that:
 * 1. Stores device_key (from URL fragment) in sessionStorage
 * 2. Loads attached iframe
 * 3. Requests OAuth URL from attached (generate_oauth_url)
 * 4. Redirects to OAuth provider
 *
 * The session cookie is set HERE so it lives in the OS browser context
 * (ASWebAuthenticationSession / Custom Tabs), not in the RN app's HTTP client.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider") ?? "";
  const apiKey = searchParams.get("api_key") ?? "";
  const redirectScheme = searchParams.get("redirect_scheme") ?? "";
  const hostOrigin = searchParams.get("host_origin") ?? "";

  // Create session — cookie is set in the OS browser context
  const { sessionId } = createSession();

  const iframeSrc = buildIframeSrc(hostOrigin, apiKey);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Oko RN Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body { display: flex; align-items: center; justify-content: center; font-family: -apple-system, sans-serif; background: #f5f5f5; }
    .status { text-align: center; color: #666; font-size: 16px; }
    iframe { display: none; }
  </style>
</head>
<body>
  <div class="status" id="status">Preparing sign-in...</div>
  <iframe id="oko-attached" src="${escapeHtml(iframeSrc)}"></iframe>
  <script>
${buildLoginScript(provider, apiKey, redirectScheme)}
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": sessionCookie(sessionId),
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildIframeSrc(hostOrigin: string, apiKey: string): string {
  const params = new URLSearchParams();
  if (hostOrigin) params.set("host_origin", hostOrigin);
  if (apiKey) params.set("api_key", apiKey);
  return `/?${params.toString()}`;
}

function buildLoginScript(
  provider: string,
  apiKey: string,
  redirectScheme: string,
): string {
  return `
(function() {
  'use strict';

  var provider = ${JSON.stringify(provider)};
  var apiKey = ${JSON.stringify(apiKey)};
  var redirectScheme = ${JSON.stringify(redirectScheme)};
  var statusEl = document.getElementById('status');
  var iframe = document.getElementById('oko-attached');
  var attachedOrigin = window.location.origin;

  // 1. Store device_key from URL fragment into sessionStorage
  var hash = window.location.hash;
  if (hash) {
    var dkMatch = hash.match(/dk=([a-f0-9]+)/);
    if (dkMatch && dkMatch[1]) {
      sessionStorage.setItem('oko_rn_device_key', dkMatch[1]);
    }
    // Also store redirect_scheme for the complete page
    sessionStorage.setItem('oko_rn_redirect_scheme', redirectScheme);
    sessionStorage.setItem('oko_rn_api_key', apiKey);
    // Clear fragment from URL (don't leak device_key in history)
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  // 2. Wait for attached iframe init
  window.addEventListener('message', function(event) {
    if (event.origin !== attachedOrigin) return;
    var msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.msg_type === 'init') {
      // Respond with init_ack
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          target: 'oko_attached',
          msg_type: 'init_ack',
          payload: { success: true, data: null }
        });
      }

      // Check if attached init succeeded (WASM loaded, etc.)
      if (msg.payload && !msg.payload.success) {
        statusEl.textContent = 'Error: wallet initialization failed — ' + (msg.payload.err || 'unknown');
        console.error('[oko-rn-login] attached init failed:', msg.payload);
        return;
      }

      // 3. Request OAuth URL from attached
      statusEl.textContent = 'Redirecting to ' + provider + '...';
      requestOAuthUrl();
    }
  });

  function requestOAuthUrl() {
    var channel = new MessageChannel();
    channel.port1.onmessage = function(ackEvent) {
      var ack = ackEvent.data;
      if (ack.msg_type === 'generate_oauth_url_ack' && ack.payload && ack.payload.success) {
        // 4. Redirect to OAuth provider
        window.location.href = ack.payload.data.url;
      } else {
        statusEl.textContent = 'Failed to generate OAuth URL';
        console.error('[oko-rn-login] generate_oauth_url failed:', ack);
      }
    };

    iframe.contentWindow.postMessage({
      target: 'oko_attached',
      msg_type: 'generate_oauth_url',
      payload: {
        provider: provider,
        apiKey: apiKey,
        targetOrigin: window.location.origin,
        redirectScheme: null,
        rnOsBrowser: true
      }
    }, attachedOrigin, [channel.port2]);
  }

  console.log('[oko-rn-login] login page initialized, provider:', provider);
})();
  `;
}
