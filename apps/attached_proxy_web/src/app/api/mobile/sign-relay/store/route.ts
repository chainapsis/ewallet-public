import { storeTokens, storeWithKey } from "../../../../../relay/token_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Store a signing request or wallet info, return a one-time relay code.
 *  If `key` is provided, use it as the code instead of generating a random one. */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || body.payload === undefined) {
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
  } catch {
    return Response.json(
      { success: false, error: "invalid_request" },
      { status: 400 },
    );
  }
}
