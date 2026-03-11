import { randomBytes } from "node:crypto";

interface Session {
  createdAt: number;
  expiresAt: number;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const sessions = new Map<string, Session>();

// Periodic cleanup of expired sessions
setInterval(
  () => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (session.expiresAt <= now) {
        sessions.delete(id);
      }
    }
  },
  5 * 60 * 1000,
); // every 5 minutes

/** Create a new session. Returns only the sessionId. */
export function createSession(): { sessionId: string } {
  const sessionId = randomBytes(32).toString("hex");

  sessions.set(sessionId, {
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  return { sessionId };
}

export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}
