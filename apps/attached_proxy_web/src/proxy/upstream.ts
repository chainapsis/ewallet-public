import type { NextRequest } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function getUpstreamOrigin(): string {
  const raw = process.env.PROXY_UPSTREAM_ORIGIN;
  if (!raw) {
    throw new Error("PROXY_UPSTREAM_ORIGIN is not set");
  }

  const parsed = new URL(raw);
  if (
    parsed.pathname !== "/" ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0
  ) {
    throw new Error(
      "PROXY_UPSTREAM_ORIGIN must be an origin only, without path, query, or hash",
    );
  }

  return parsed.origin;
}

function buildUpstreamUrl(request: NextRequest): URL {
  const upstreamOrigin = getUpstreamOrigin();
  return new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    upstreamOrigin,
  );
}

function buildUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === "host" || HOP_BY_HOP_HEADERS.has(lower)) {
      continue;
    }

    headers.set(key, value);
  }

  const forwardedHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");

  headers.set("x-forwarded-host", forwardedHost);
  headers.set("x-forwarded-proto", forwardedProto);
  headers.set("x-forwarded-origin", request.nextUrl.origin);

  return headers;
}

async function buildUpstreamBody(
  request: NextRequest,
): Promise<ArrayBuffer | undefined> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

function buildDownstreamHeaders(upstreamResponse: Response): Headers {
  const headers = new Headers();

  for (const [key, value] of upstreamResponse.headers.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || lower === "content-length") {
      continue;
    }

    headers.set(key, value);
  }

  const cookieHeaderCarrier = upstreamResponse.headers as Headers & {
    getSetCookie?: () => string[];
  };
  if (typeof cookieHeaderCarrier.getSetCookie === "function") {
    const setCookies = cookieHeaderCarrier.getSetCookie();
    if (setCookies.length > 0) {
      headers.delete("set-cookie");
      for (const cookie of setCookies) {
        headers.append("set-cookie", cookie);
      }
    }
  }

  return headers;
}

export async function proxyRequest(request: NextRequest): Promise<Response> {
  try {
    const upstreamUrl = buildUpstreamUrl(request);
    const upstreamHeaders = buildUpstreamHeaders(request);
    const upstreamBody = await buildUpstreamBody(request);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: upstreamBody,
      cache: "no-store",
      redirect: "manual",
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: buildDownstreamHeaders(upstreamResponse),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return Response.json(
      {
        success: false,
        code: "PROXY_UPSTREAM_ERROR",
        message,
      },
      { status: 502 },
    );
  }
}

export function getProxyStatus() {
  try {
    return {
      ok: true,
      upstreamOrigin: getUpstreamOrigin(),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
