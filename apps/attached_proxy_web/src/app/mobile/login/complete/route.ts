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
 * 5. Stores wallet info in relay
 * 6. Deep-links back to app with wallet_info_code
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
  var redirectScheme = sessionStorage.getItem('oko_mobile_redirect_scheme');
  var apiKey = sessionStorage.getItem('oko_mobile_api_key');

  if (!redirectScheme) {
    statusEl.textContent = 'Error: missing session data. Please try again.';
    console.error('[oko-mobile-login-complete] missing redirectScheme from sessionStorage');
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

  // Step 2: After keygen, get wallet info and redirect back to app
  // Key shares are already persisted in attached's localStorage (zustand persist).
  // No server upload needed — localStorage is shared across OS browser sessions.
  async function handleKeygenComplete() {
    try {
      statusEl.textContent = 'Finalizing...';

      // Get public wallet info from attached
      var walletInfo = await sendMessageToAttached({
        target: 'oko_attached',
        msg_type: 'get_wallet_info',
        payload: null
      });

      var publicInfo = walletInfo.payload;
      // get_wallet_info returns { success, data: { authType, publicKey, ... } }
      // SDK expects the flat data object, so unwrap it
      var walletData = (publicInfo && publicInfo.success) ? publicInfo.data : publicInfo;

      // Store public wallet info in relay
      var relayRes = await fetch('/api/mobile/sign-relay/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: walletData })
      });
      var relayData = await relayRes.json();

      if (!relayData.success) {
        throw new Error('Failed to store wallet info in relay');
      }

      // Deep link back to app
      var deepLink = redirectScheme + '://?type=login&wallet_info_code=' + relayData.code;
      statusEl.textContent = 'Redirecting to app...';
      window.location.href = deepLink;
    } catch(err) {
      statusEl.textContent = 'Error: ' + err.message;
      console.error('[oko-mobile-login-complete] error:', err);
    }
  }

  // Helper: send message to attached iframe and wait for ack
  function sendMessageToAttached(msg) {
    return new Promise(function(resolve, reject) {
      var channel = new MessageChannel();
      var timer = setTimeout(function() {
        reject(new Error('Timeout waiting for ' + msg.msg_type + '_ack'));
      }, 120000); // 2 min timeout for keygen

      channel.port1.onmessage = function(ackEvent) {
        clearTimeout(timer);
        resolve(ackEvent.data);
      };

      iframe.contentWindow.postMessage(msg, attachedOrigin, [channel.port2]);
    });
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
