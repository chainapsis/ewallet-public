import { type NextRequest, NextResponse } from "next/server";

/**
 * OS-browser signing page (raw HTML route handler).
 *
 * Opened via expo-web-browser's openAuthSessionAsync for every signing request.
 * Returns a standalone HTML page that:
 * 1. Reads relay_code from query
 * 2. Loads attached iframe (key shares restored from localStorage automatically)
 * 3. Consumes signing request from relay
 * 4. Sends open_modal to attached (user sees signing UI)
 * 5. Waits for open_modal_ack (approve/reject/error)
 * 6. Stores result in relay with key = result:{relay_code}
 *
 * The SDK polls the relay for the result and dismisses the Custom Tab
 * programmatically — no deep link or redirect needed.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const relayCode = searchParams.get("relay_code") ?? "";
  const hostOrigin = searchParams.get("host_origin") ?? "";
  const apiKey = searchParams.get("api_key") ?? "";
  const redirectScheme = searchParams.get("redirect_scheme") ?? "";

  const iframeSrc = buildIframeSrc(hostOrigin, apiKey);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Oko Wallet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body { display: flex; flex-direction: column; font-family: -apple-system, sans-serif; background: #f5f5f5; }
    #status { text-align: center; color: #666; font-size: 16px; padding: 20px; }
    #status.hidden { display: none; }
    iframe { flex: 1; width: 100%; border: none; }
    iframe.hidden { display: none; }
  </style>
</head>
<body>
  <div id="status">Preparing...</div>
  <iframe id="oko-attached" class="hidden" src="${escapeHtml(iframeSrc)}"></iframe>
  <script>
${buildSignScript(relayCode, redirectScheme)}
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

function buildSignScript(relayCode: string, redirectScheme: string): string {
  return `
(function() {
  'use strict';

  var relayCode = ${JSON.stringify(relayCode)};
  var redirectScheme = ${JSON.stringify(redirectScheme)};
  var resultKey = 'result:' + relayCode;
  var statusEl = document.getElementById('status');
  var iframe = document.getElementById('oko-attached');
  var attachedOrigin = window.location.origin;

  if (!relayCode) {
    statusEl.textContent = 'Error: missing relay code.';
    console.error('[oko-mobile-sign] missing relay_code');
    return;
  }

  // Wait for attached iframe init
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
      startSigningFlow();
    }
  });

  // Key shares are already in attached's localStorage (zustand persist).
  // No restore needed — localStorage is shared across OS browser sessions.
  async function startSigningFlow() {
    try {
      statusEl.textContent = 'Loading wallet...';

      // Consume signing request from relay
      var consumeRes = await fetch('/api/mobile/sign-relay/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: relayCode })
      });
      var consumeData = await consumeRes.json();

      if (!consumeData.success || !consumeData.payload) {
        throw new Error('Invalid or expired signing request');
      }

      var signingRequest = consumeData.payload;

      // Patch origin: SDK sets origin to the app's redirect scheme,
      // but appState stores apiKey/keyShares under the proxy origin.
      if (signingRequest.data && signingRequest.data.payload) {
        signingRequest.data.payload.origin = attachedOrigin;
      }

      // Show modal: make iframe visible, hide status
      statusEl.className = 'hidden';
      iframe.className = '';

      // Send open_modal to attached
      var modalResult = await sendMessageToAttached({
        target: 'oko_attached',
        msg_type: 'open_modal',
        payload: signingRequest
      });

      // Got result — store in relay with known key so SDK can poll for it
      iframe.className = 'hidden';
      statusEl.className = '';
      await storeResult(modalResult.payload);
      returnToApp();

    } catch(err) {
      statusEl.className = '';
      iframe.className = 'hidden';
      statusEl.textContent = 'Error: ' + err.message;
      console.error('[oko-mobile-sign] error:', err);

      // Store error result so SDK can detect the failure
      try {
        await storeResult({
          type: 'error',
          error: { type: 'os_browser_error', message: err.message }
        });
        returnToApp();
      } catch(e) {
        console.error('[oko-mobile-sign] failed to store error result:', e);
      }
    }
  }

  // Navigate to custom scheme to close the OS browser session.
  // iOS: ASWebAuthenticationSession detects scheme redirect → auto-close.
  // Android: Navigates to oko.auth.callback:// → OkoAuthCallbackActivity
  //   (sole handler) receives intent, Custom Tab auto-closes.
  function returnToApp() {
    if (redirectScheme) {
      window.location.href = redirectScheme + '://';
    }
  }

  // Store result in relay with key = result:{relayCode}
  // SDK polls this key to detect completion.
  async function storeResult(payload) {
    var res = await fetch('/api/mobile/sign-relay/result-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: payload, key: resultKey })
    });
    var data = await res.json();
    if (!data.success) {
      throw new Error('Failed to store signing result');
    }
  }

  // Helper: send message to attached iframe and wait for ack
  function sendMessageToAttached(msg) {
    return new Promise(function(resolve, reject) {
      var channel = new MessageChannel();
      var timer = setTimeout(function() {
        reject(new Error('Timeout waiting for ' + msg.msg_type + ' response'));
      }, 300000); // 5 min timeout for signing (user interaction)

      channel.port1.onmessage = function(ackEvent) {
        clearTimeout(timer);
        resolve(ackEvent.data);
      };

      iframe.contentWindow.postMessage(msg, attachedOrigin, [channel.port2]);
    });
  }

  console.log('[oko-mobile-sign] sign page initialized');
})();
  `;
}
