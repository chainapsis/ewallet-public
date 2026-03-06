import { getProxyStatus } from "../../proxy/upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = getProxyStatus();

  return Response.json(status, {
    status: status.ok ? 200 : 500,
  });
}
