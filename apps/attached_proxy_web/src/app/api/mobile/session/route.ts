import {
  createSession,
  getSession,
} from "../../../../relay/session_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "oko_mobile_session";

function sessionCookie(sessionId: string): string {
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`;
}

function getSessionIdFromCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

/** POST — create a new session */
export async function POST() {
  const { sessionId } = createSession();

  return Response.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": sessionCookie(sessionId),
      },
    },
  );
}

/** GET — check if current session is valid */
export async function GET(request: Request) {
  const sessionId = getSessionIdFromCookie(request);
  if (!sessionId) {
    return Response.json(
      { success: false, error: "no_session" },
      { status: 401 },
    );
  }

  const session = getSession(sessionId);
  if (!session) {
    return Response.json(
      { success: false, error: "invalid_or_expired_session" },
      { status: 401 },
    );
  }

  return Response.json({ success: true });
}
