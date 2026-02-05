import request from "supertest";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { createTestContext, type TestContext } from "@e2e/utils/test_context";

describe("e2e_test_active_nodes_below_threshold", () => {
  let ctx: TestContext;
  const AUTH_TYPE: AuthType = "google";

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("returns active_nodes_below_threshold=true when active KS nodes < threshold", async () => {
    await ctx.resetAllDatabases();

    // Prepare: set sss_threshold greater than active node count (3 nodes active by default)
    await ctx.okoApiPool.query(
      `UPDATE key_share_node_meta SET sss_threshold = 4, updated_at = NOW()`,
    );

    // Call check endpoint (public)
    const email = "any_user@example.com";
    const res = await request(ctx.okoApiApp)
      .post("/tss/v2/user/check")
      .send({ email, auth_type: AUTH_TYPE });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.active_nodes_below_threshold).toBe(true);
    expect(res.body.data.keyshare_node_meta.threshold).toBeGreaterThan(
      res.body.data.keyshare_node_meta.nodes.length,
    );
  });
});
