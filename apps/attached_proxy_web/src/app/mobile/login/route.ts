import { type NextRequest, NextResponse } from "next/server";

import { createSession } from "../../../relay/session_store";

const COOKIE_NAME = "oko_mobile_session";

// Auth0 config for email login — built directly in the login page
// so we don't route email through attached's generate_oauth_url.
const AUTH0_DOMAIN = "auth0.oko.app";
const AUTH0_CLIENT_ID = "GnPcFAjGKAcXZpAzQ8vGBmzfcfV2hu1Q";
const AUTH0_CONNECTION = "email";

function sessionCookie(sessionId: string): string {
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`;
}

/**
 * OS-browser login entry page (raw HTML route handler).
 *
 * Opened via the mobile SDK's OS browser integration.
 * Creates a server session (sets HttpOnly cookie) and returns a standalone
 * HTML page that:
 * 1. Stores redirect scheme / api key in sessionStorage
 * 2. Loads attached iframe
 * 3. Requests OAuth URL from attached (generate_oauth_url)
 * 4. Redirects to OAuth provider
 *
 * The session cookie is set HERE so it lives in the OS browser context
 * (ASWebAuthenticationSession / Custom Tabs), not in the mobile app's HTTP client.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider") ?? "";
  const apiKey = searchParams.get("api_key") ?? "";
  const pollSessionId = searchParams.get("session_id") ?? "";
  const redirectScheme = searchParams.get("redirect_scheme") ?? "";
  const hostOrigin = searchParams.get("host_origin") ?? "";

  // Create session — cookie is set in the OS browser context
  const { sessionId } = createSession();

  const isEmail = provider === "email";
  const iframeSrc = isEmail ? "" : buildIframeSrc(hostOrigin, apiKey);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Oko Login</title>
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
  ${isEmail ? "" : `<iframe id="oko-attached" src="${escapeHtml(iframeSrc)}"></iframe>`}
  <script>
${isEmail ? buildEmailLoginScript(apiKey, pollSessionId, redirectScheme) : buildOAuthLoginScript(provider, apiKey, pollSessionId, redirectScheme)}
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

/**
 * Email login: redirect to Auth0 Universal Login directly.
 * No attached iframe needed — Auth0 handles the entire email OTP flow
 * on its own domain (avoids 3rd-party cookie issues on mobile).
 */
function buildEmailLoginScript(apiKey: string, sessionId: string, redirectScheme: string): string {
  return `
(function() {
  'use strict';

  var apiKey = ${JSON.stringify(apiKey)};
  var sessionId = ${JSON.stringify(sessionId)};
  var redirectScheme = ${JSON.stringify(redirectScheme)};
  var statusEl = document.getElementById('status');

  // 1. Store session info in sessionStorage for /mobile/login/complete
  if (sessionId) sessionStorage.setItem('oko_mobile_session_id', sessionId);
  if (redirectScheme) sessionStorage.setItem('oko_mobile_redirect_scheme', redirectScheme);
  sessionStorage.setItem('oko_mobile_api_key', apiKey);

  // 2. Generate nonce and store in sessionStorage for /mobile/login/complete
  var nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  var nonce = Array.from(nonceBytes).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  sessionStorage.setItem('oko_mobile_email_nonce', nonce);

  // 3. Build Auth0 Universal Login URL
  var state = JSON.stringify({
    apiKey: apiKey,
    targetOrigin: window.location.origin,
    provider: 'auth0',
    mobileOsBrowser: true
  });

  var auth0Url = new URL(${JSON.stringify(`https://${AUTH0_DOMAIN}/authorize`)});
  auth0Url.searchParams.set('client_id', ${JSON.stringify(AUTH0_CLIENT_ID)});
  auth0Url.searchParams.set('redirect_uri', window.location.origin + '/email/callback');
  auth0Url.searchParams.set('response_type', 'token id_token');
  auth0Url.searchParams.set('scope', 'openid profile email');
  auth0Url.searchParams.set('connection', ${JSON.stringify(AUTH0_CONNECTION)});
  auth0Url.searchParams.set('nonce', nonce);
  auth0Url.searchParams.set('state', state);

  // 4. Redirect immediately
  statusEl.textContent = 'Redirecting to email login...';
  window.location.href = auth0Url.toString();

  console.log('[oko-mobile-login] email login, redirecting to Auth0');
})();
  `;
}

/**
 * OAuth login (Google, X, Discord, GitHub): load attached iframe,
 * request OAuth URL via generate_oauth_url message, then redirect.
 */
function buildOAuthLoginScript(
  provider: string,
  apiKey: string,
  sessionId: string,
  redirectScheme: string,
): string {
  return `
(function() {
  'use strict';

  var provider = ${JSON.stringify(provider)};
  var apiKey = ${JSON.stringify(apiKey)};
  var sessionId = ${JSON.stringify(sessionId)};
  var redirectScheme = ${JSON.stringify(redirectScheme)};
  var statusEl = document.getElementById('status');
  var iframe = document.getElementById('oko-attached');
  var attachedOrigin = window.location.origin;

  // 1. Store session info in sessionStorage for /mobile/login/complete
  if (sessionId) sessionStorage.setItem('oko_mobile_session_id', sessionId);
  if (redirectScheme) sessionStorage.setItem('oko_mobile_redirect_scheme', redirectScheme);
  sessionStorage.setItem('oko_mobile_api_key', apiKey);

  // 2. Wait for attached iframe init
  window.addEventListener('message', function(event) {
    if (event.origin !== attachedOrigin) return;
    var msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.msg_type === 'init') {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          target: 'oko_attached',
          msg_type: 'init_ack',
          payload: { success: true, data: null }
        });
      }

      if (msg.payload && !msg.payload.success) {
        statusEl.textContent = 'Error: wallet initialization failed — ' + (msg.payload.err || 'unknown');
        console.error('[oko-mobile-login] attached init failed:', msg.payload);
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
        window.location.href = ack.payload.data.url;
      } else {
        statusEl.textContent = 'Failed to generate OAuth URL';
        console.error('[oko-mobile-login] generate_oauth_url failed:', ack);
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
        mobileOsBrowser: true
      }
    }, attachedOrigin, [channel.port2]);
  }

  console.log('[oko-mobile-login] login page initialized, provider:', provider);
})();
  `;
}
