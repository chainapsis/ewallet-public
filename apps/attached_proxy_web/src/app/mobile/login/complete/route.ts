import { type NextRequest, NextResponse } from "next/server";

/**
 * OS-browser login completion page (raw HTML route handler).
 *
 * Loaded after OAuth callback redirects here with tokens.
 * Returns a standalone HTML page that:
 * 1. Loads attached iframe
 * 2. Sends oauth_info_pass to attached (triggers keygen)
 * 3. Waits for oauth_sign_in_update (keygen complete)
 * 4. Gets public wallet info (key shares persist in attached's localStorage)
 * 5. Stores wallet info in relay with key = session_id
 *
 * The SDK polls the relay for the result and dismisses the Custom Tab
 * programmatically — no deep link or redirect needed.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const serializedParams = JSON.stringify(params);
  const hostOrigin = params.host_origin ?? "";
  const apiKey = params.api_key ?? "";
  const iframeSrc = buildIframeSrc(hostOrigin, apiKey);

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
    .status { text-align: center; color: #666; font-size: 16px; padding: 20px; }
    iframe { display: none; }
  </style>
</head>
<body>
  <div class="status" id="status">Completing sign-in...</div>
  <iframe id="oko-attached" src="${escapeHtml(iframeSrc)}"></iframe>
  <script>
${buildCompleteScript(serializedParams)}
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
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

function buildCompleteScript(serializedParams: string): string {
  return `
(function() {
  'use strict';

  var oauthParams = ${serializedParams};
  var statusEl = document.getElementById('status');
  var iframe = document.getElementById('oko-attached');
  var attachedOrigin = window.location.origin;

  // Read stored values from sessionStorage (set by /mobile/login entry page)
  var sessionId = sessionStorage.getItem('oko_mobile_session_id');
  var redirectScheme = sessionStorage.getItem('oko_mobile_redirect_scheme') || '';
  var apiKey = sessionStorage.getItem('oko_mobile_api_key');

  if (!sessionId) {
    statusEl.textContent = 'Error: missing session data. Please try again.';
    console.error('[oko-mobile-login-complete] missing session_id from sessionStorage');
    return;
  }

  // Build the OAuth payload to send to attached (same structure as oauth_info_pass)
  var provider = oauthParams.provider || '';
  var oauthPayload = buildOAuthPayload(oauthParams, apiKey, provider);

  if (!oauthPayload) {
    statusEl.textContent = 'Error: invalid OAuth response. Provider=' + provider + ', keys=' + Object.keys(oauthParams).join(',');
    console.error('[oko-mobile-login-complete] invalid OAuth response. oauthParams:', JSON.stringify(oauthParams), 'provider:', provider);
    return;
  }

  // Listen for messages from attached iframe
  window.addEventListener('message', function(event) {
    if (event.origin !== attachedOrigin) return;
    var msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    // Handle init
    if (msg.msg_type === 'init') {
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
        console.error('[oko-mobile-login-complete] attached init failed:', msg.payload);
        return;
      }

      statusEl.textContent = 'Processing sign-in...';

      // Inject nonce/codeVerifier into attached before oauth_info_pass.
      // Email login generates nonce in the /mobile/login page script (not in attached),
      // so we pass it via set_reauth_params. OAuth providers set nonce/PKCE via
      // generate_oauth_url which already persists to attached's localStorage.
      var emailNonce = sessionStorage.getItem('oko_mobile_email_nonce');
      if (emailNonce) {
        iframe.contentWindow.postMessage({
          target: 'oko_attached',
          msg_type: 'set_reauth_params',
          payload: { nonce: emailNonce }
        }, attachedOrigin);
        sessionStorage.removeItem('oko_mobile_email_nonce');
      }

      sendOAuthInfoPass();
      return;
    }

    // Handle oauth_sign_in_update (keygen complete)
    if (msg.msg_type === 'oauth_sign_in_update') {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          target: 'oko_attached',
          msg_type: 'oauth_sign_in_update_ack',
          payload: null
        });
      }

      statusEl.textContent = 'Securing wallet...';
      handleKeygenComplete();
      return;
    }
  });

  // Step 1: Send OAuth tokens to attached for keygen
  function sendOAuthInfoPass() {
    var channel = new MessageChannel();
    channel.port1.onmessage = function(ackEvent) {
      var ack = ackEvent.data;
      console.log('[oko-mobile-login-complete] oauth_info_pass_ack:', ack);
      // Ack received. Keygen may still be in progress.
      // We wait for oauth_sign_in_update event for completion.
    };

    iframe.contentWindow.postMessage({
      target: 'oko_attached',
      msg_type: 'oauth_info_pass',
      payload: oauthPayload
    }, attachedOrigin, [channel.port2]);
  }

  // Step 2: After keygen, get wallet info and store in relay.
  // Key shares are already persisted in attached's localStorage (zustand persist).
  // SDK polls the relay for the result and dismisses the Custom Tab.
  async function handleKeygenComplete() {
    try {
      statusEl.textContent = 'Finalizing...';

      // Read wallet data directly from localStorage (same origin as attached iframe).
      // The attached iframe's Zustand persist store writes wallet data synchronously
      // before dispatching oauth_sign_in_update, so it's guaranteed to be available.
      var walletData = readWalletFromLocalStorage();

      if (!walletData) {
        throw new Error('Wallet data not found in localStorage after keygen');
      }

      // Store public wallet info in relay with session_id as key
      var relayRes = await fetch('/api/mobile/sign-relay/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: walletData, key: sessionId })
      });
      var relayData = await relayRes.json();

      if (!relayData.success) {
        throw new Error('Failed to store wallet info in relay');
      }

      returnToApp();
    } catch(err) {
      statusEl.textContent = 'Error: ' + err.message;
      console.error('[oko-mobile-login-complete] error:', err);
    }
  }

  // Read wallet info from attached iframe's Zustand persist store in localStorage.
  // Storage key: "oko-wallet-app-2", structure: { state: { perOrigin: { [origin]: { wallet } } } }
  function readWalletFromLocalStorage() {
    try {
      var raw = localStorage.getItem('oko-wallet-app-2');
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var wallet = parsed && parsed.state && parsed.state.perOrigin
        && parsed.state.perOrigin[attachedOrigin]
        && parsed.state.perOrigin[attachedOrigin].wallet;
      if (!wallet) return null;
      return {
        authType: wallet.authType || null,
        publicKey: wallet.publicKey || null,
        email: wallet.email || null,
        name: wallet.name || null
      };
    } catch(e) {
      console.error('[oko-mobile-login-complete] failed to read wallet from localStorage:', e);
      return null;
    }
  }

  // Close the OS browser session by navigating to the callback scheme.
  // iOS: ASWebAuthenticationSession auto-closes on custom scheme navigation.
  // Android: CallbackActivity catches the scheme → CLEAR_TOP pops the Custom Tab.
  //   No popup because the Custom Tab runs in the same task as the app.
  function returnToApp() {
    if (redirectScheme) {
      window.location.href = redirectScheme + '://';
    }
  }

  // Build OAuth payload based on available params (token-based vs code-based)
  function buildOAuthPayload(params, apiKey, provider) {
    var base = {
      provider: provider,
      api_key: apiKey,
      target_origin: attachedOrigin,
      auth_type: params.auth_type || provider
    };

    // Token-based flow (Google, Email/Auth0): access_token and/or id_token
    if (params.access_token || params.id_token) {
      base.access_token = params.access_token || '';
      base.id_token = params.id_token || '';
      return base;
    }

    // Code-based flow (X, Discord, GitHub): authorization code
    if (params.code) {
      base.code = params.code;
      return base;
    }

    // Neither tokens nor code present
    return null;
  }

  console.log('[oko-mobile-login-complete] complete page initialized, provider:', provider);
})();
  `;
}
