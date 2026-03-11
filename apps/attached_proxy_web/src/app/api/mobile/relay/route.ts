import {
  storeTokens,
  storeWithKey,
  consumeTokens,
} from "../../../../relay/token_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body.action !== "string") {
      return Response.json(
        { success: false, error: "missing_action" },
        { status: 400 },
      );
    }

    if (body.action === "store") {
      if (body.payload === undefined) {
        return Response.json(
          { success: false, error: "missing_payload" },
          { status: 400 },
        );
      }

      let code: string;
      if (typeof body.key === "string" && body.key) {
        storeWithKey(body.key, body.payload);
        code = body.key;
      } else {
        code = storeTokens(body.payload);
      }

      return Response.json({ success: true, code });
    }

    if (body.action === "consume") {
      if (typeof body.code !== "string") {
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
    }

    return Response.json(
      { success: false, error: "invalid_action" },
      { status: 400 },
    );
  } catch {
    return Response.json(
      { success: false, error: "invalid_request" },
      { status: 400 },
    );
  }
}
