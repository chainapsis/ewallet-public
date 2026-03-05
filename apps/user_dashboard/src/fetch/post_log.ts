const OKO_API_ENDPOINT = process.env.NEXT_PUBLIC_OKO_API_ENDPOINT;

type PostLogParams =
  | {
      level: "info";
      message: string;
      meta?: Record<string, unknown>;
    }
  | {
      level: "error";
      message: string;
      error: { name: string; message: string };
      meta?: Record<string, unknown>;
    };

export function postLog(log: PostLogParams): void {
  if (!OKO_API_ENDPOINT) {
    return;
  }

  const body = {
    level: log.level,
    message: log.message,
    timestamp: new Date().toISOString(),
    error: log.level === "error" ? log.error : undefined,
    session: { pageUrl: window.location.href },
    clientInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screen: { width: screen.width, height: screen.height },
    },
    meta: log.meta,
  };

  fetch(`${OKO_API_ENDPOINT}/log/v1/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {
    // fire-and-forget
  });
}
