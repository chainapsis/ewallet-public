import {
  getSession,
  storeEncryptedKeyShares,
  getEncryptedKeyShares,
} from "../../../../relay/session_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "oko_mobile_session";

function getSessionIdFromCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

/** POST — store encrypted key shares */
export async function POST(request: Request) {
  const sessionId = getSessionIdFromCookie(request);
  if (!sessionId || !getSession(sessionId)) {
    return Response.json(
      { success: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    if (!body || typeof body.encrypted_blob !== "string") {
      return Response.json(
        { success: false, error: "missing_encrypted_blob" },
        { status: 400 },
      );
    }

    const stored = storeEncryptedKeyShares(sessionId, body.encrypted_blob);
    if (!stored) {
      return Response.json(
        { success: false, error: "session_expired" },
        { status: 401 },
      );
    }

    return Response.json({ success: true });
  } catch {
    return Response.json(
      { success: false, error: "invalid_request" },
      { status: 400 },
    );
  }
}

/** GET — retrieve encrypted key shares */
export async function GET(request: Request) {
  const sessionId = getSessionIdFromCookie(request);
  if (!sessionId || !getSession(sessionId)) {
    return Response.json(
      { success: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const blob = getEncryptedKeyShares(sessionId);
  if (blob === null) {
    return Response.json(
      { success: false, error: "no_key_shares" },
      { status: 404 },
    );
  }

  return Response.json({ success: true, encrypted_blob: blob });
}
