import { consumeTokens } from "../../../../../relay/token_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Consume a one-time result code and return the stored signing result */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body.code !== "string") {
      return Response.json(
        { success: false, error: "missing_code" },
        { status: 400 },
      );
    }

    const payload = consumeTokens(body.code);

    if (payload === null) {
      return Response.json(
        { success: false, error: "invalid_or_expired_code" },
        { status: 404 },
      );
    }

    return Response.json({ success: true, payload });
  } catch {
    return Response.json(
      { success: false, error: "invalid_request" },
      { status: 400 },
    );
  }
}
