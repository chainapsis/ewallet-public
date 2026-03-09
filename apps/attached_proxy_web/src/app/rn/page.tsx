import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oko RN Bridge",
};

export default function RnBridgePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <RnBridgeContent searchParamsPromise={searchParams} />;
}

async function RnBridgeContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await searchParamsPromise;
  const hostOrigin = searchParams.host_origin ?? "";
  const apiKey = searchParams.api_key ?? "";
  // iframe loads attached via the proxy itself (relative path), not upstream directly.
  // The phone's WebView can't reach the upstream localhost.
  const iframeSrc = buildIframeSrc(hostOrigin, apiKey);

  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { width: 100%; height: 100%; overflow: hidden; }
              iframe { width: 100%; height: 100%; border: none; }
            `,
          }}
        />
      </head>
      <body>
        <iframe id="oko-attached" src={iframeSrc} />
        <script
          dangerouslySetInnerHTML={{
            __html: buildBridgeScript(),
          }}
        />
      </body>
    </html>
  );
}

function buildIframeSrc(hostOrigin: string, apiKey: string): string {
  // Use relative path — the proxy's catch-all route will forward to upstream
  const params = new URLSearchParams();
  if (hostOrigin) params.set("host_origin", hostOrigin);
  if (apiKey) params.set("api_key", apiKey);
  return `/?${params.toString()}`;
}

function buildBridgeScript(): string {
  return `
(function() {
  'use strict';

  var iframe = document.getElementById('oko-attached');
  // iframe is loaded via the same proxy origin, so use window.location.origin
  var attachedOrigin = window.location.origin;

  // --- 1. Handle messages FROM attached iframe (init) ---
  window.addEventListener('message', function(event) {
    if (event.origin !== attachedOrigin) return;

    var msg = event.data;
    if (!msg || typeof msg !== 'object' || !msg.msg_type) return;

    // init message: attached loaded and ready
    if (msg.msg_type === 'init') {
      // Respond with init_ack via port
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          target: 'oko_attached',
          msg_type: 'init_ack',
          payload: { success: true, data: null }
        });
      }

      // Forward init event to RN
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'event',
          eventType: 'init',
          payload: msg.payload
        }));
      }
      return;
    }

  });

  // --- 2. Handle messages FROM RN SDK (forwarded to attached iframe) ---
  function handleRnMessage(data) {
    var parsed;
    try {
      parsed = JSON.parse(data);
    } catch(e) {
      return; // not a bridge message
    }

    if (!parsed || !parsed.id || !parsed.msg) return;

    if (!iframe || !iframe.contentWindow) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          id: parsed.id,
          type: 'ack',
          payload: {
            target: 'oko_sdk',
            msg_type: 'unknown_msg_type',
            payload: 'iframe not available'
          }
        }));
      }
      return;
    }

    var channel = new MessageChannel();

    channel.port1.onmessage = function(ackEvent) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          id: parsed.id,
          type: 'ack',
          payload: ackEvent.data
        }));
      }
    };

    iframe.contentWindow.postMessage(parsed.msg, attachedOrigin, [channel.port2]);
  }

  // react-native-webview posts messages that arrive via both window and document
  // depending on the platform (iOS vs Android)
  window.addEventListener('message', function(event) {
    // Skip messages from attached iframe (already handled above)
    if (event.origin === attachedOrigin) return;

    if (typeof event.data === 'string') {
      handleRnMessage(event.data);
    }
  });

  document.addEventListener('message', function(event) {
    if (typeof event.data === 'string') {
      handleRnMessage(event.data);
    }
  });

  console.log('[oko-bridge] bridge page initialized');
})();
  `;
}
