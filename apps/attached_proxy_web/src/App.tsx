import { type RefObject, useMemo, useRef } from "react";

import { buildIframeSrc } from "./app/mobile/_shared/build_iframe_src";
import { parseClientRandomFromHash } from "./app/mobile/_shared/parse_client_random";
import { EmailLoginClient, OAuthLoginClient } from "./app/mobile/login/_client";
import { LoginCompleteClient } from "./app/mobile/login/complete/_client";
import { RpcClient } from "./app/mobile/rpc/_client";
import { SignOutClient } from "./app/mobile/sign-out/_client";

// ─── URL params helper ───

function getParam(key: string): string {
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

// ─── App ───

export function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const path = window.location.pathname;

  const iframeSrc = useMemo(() => {
    const hostOrigin = getParam("host_origin");
    const apiKey = getParam("api_key");
    const clientRandom =
      parseClientRandomFromHash() ??
      sessionStorage.getItem("oko_mobile_client_random");
    return buildIframeSrc(hostOrigin, apiKey, clientRandom ?? undefined);
  }, []);

  return (
    <>
      <iframe
        id="oko-attached"
        title="Oko Wallet"
        ref={iframeRef}
        src={iframeSrc}
        style={{
          display: "none",
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          border: "none",
          background: "transparent",
          zIndex: 1,
        }}
      />
      <Router path={path} iframeRef={iframeRef} />
    </>
  );
}

function Router({
  path,
  iframeRef,
}: {
  path: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}) {
  if (path === "/mobile/rpc") {
    return (
      <RpcClient
        iframeRef={iframeRef}
        method={getParam("method")}
        redirectScheme={getParam("redirect_scheme")}
        expectedPublicKey={getParam("expected_pk") || null}
      />
    );
  }

  if (path === "/mobile/login") {
    const provider = getParam("provider");
    if (provider === "email") {
      return (
        <EmailLoginClient
          apiKey={getParam("api_key")}
          redirectScheme={getParam("redirect_scheme")}
        />
      );
    }
    return (
      <OAuthLoginClient
        iframeRef={iframeRef}
        provider={provider}
        apiKey={getParam("api_key")}
        redirectScheme={getParam("redirect_scheme")}
      />
    );
  }

  if (path === "/mobile/login/complete") {
    return <LoginCompleteClient iframeRef={iframeRef} />;
  }

  if (path === "/mobile/sign-out") {
    return (
      <SignOutClient
        iframeRef={iframeRef}
        redirectScheme={getParam("redirect_scheme")}
      />
    );
  }

  return <div style={{ textAlign: "center", padding: 20 }}>Not found</div>;
}
