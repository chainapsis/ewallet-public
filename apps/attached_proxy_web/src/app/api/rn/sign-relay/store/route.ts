import { storeTokens } from "../../../../../relay/token_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Store a signing request or wallet info, return a one-time relay code */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || body.payload === undefined) {
      return Response.json(
        { success: false, error: "missing_payload" },
        { status: 400 },
      );
    }

    const code = storeTokens(body.payload);

    return Response.json({ success: true, code });
  } catch {
    return Response.json(
      { success: false, error: "invalid_request" },
      { status: 400 },
    );
  }
}
