import { jest } from "@jest/globals";
import type { Bytes32, Bytes33 } from "@oko-wallet/bytes";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { KeyShareNode } from "@oko-wallet/oko-types/tss";

interface CheckKeyShareV2Response {
  secp256k1?: { exists: boolean };
  ed25519?: { exists: boolean };
}

// ── Mock ────────────────────────────────────────────────────────────────

const mockRequestCheckKeyShareV2 =
  jest.fn<
    (
      ksNodeURI: string,
      userEmail: string,
      auth_type: AuthType,
      wallets: { secp256k1?: Bytes33; ed25519?: Bytes32 },
    ) => Promise<OkoApiResponse<CheckKeyShareV2Response>>
  >();

const mockRequestCheckKeyShare = jest.fn();

await jest.unstable_mockModule("@oko-wallet-api/requests", () => ({
  requestCheckKeyShare: mockRequestCheckKeyShare,
  requestCheckKeyShareV2: mockRequestCheckKeyShareV2,
}));

const { checkKeyShareFromKSNodesV2 } = await import(
  "@oko-wallet-api/api/tss/ks_node"
);

// ── Fixtures ────────────────────────────────────────────────────────────

const TEST_EMAIL = "test@example.com";
const AUTH_TYPE: AuthType = "google";

function makeKSNodes(count: number): KeyShareNode[] {
  return Array.from({ length: count }, (_, i) => ({
    node_id: `node-${i + 1}`,
    node_name: `KSNode${i + 1}`,
    status: "ACTIVE" as const,
    server_url: `http://ks${i + 1}.test`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

const SECP256K1_PK = { toHex: () => "aa".repeat(33) } as unknown as Bytes33;
const ED25519_PK = { toHex: () => "bb".repeat(32) } as unknown as Bytes32;

function successResponse(
  secp?: boolean,
  ed?: boolean,
): OkoApiResponse<CheckKeyShareV2Response> {
  const data: CheckKeyShareV2Response = {};
  if (secp !== undefined) {
    data.secp256k1 = { exists: secp };
  }
  if (ed !== undefined) {
    data.ed25519 = { exists: ed };
  }
  return { success: true, data };
}

function errorResponse(
  msg: string,
  code = "UNKNOWN_ERROR" as const,
): OkoApiResponse<CheckKeyShareV2Response> {
  return { success: false, code, msg };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("checkKeyShareFromKSNodesV2", () => {
  beforeEach(() => {
    mockRequestCheckKeyShareV2.mockReset();
  });

  // ── all-or-nothing mode (registrationThreshold not set) ───────────

  describe("all-or-nothing mode (no registrationThreshold)", () => {
    it("succeeds when all nodes have both curve keyshares", async () => {
      const nodes = makeKSNodes(3);
      mockRequestCheckKeyShareV2.mockResolvedValue(successResponse(true, true));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
      );

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.secp256k1?.nodeIds).toEqual([
          "node-1",
          "node-2",
          "node-3",
        ]);
        expect(res.data.ed25519?.nodeIds).toEqual([
          "node-1",
          "node-2",
          "node-3",
        ]);
      }
    });

    it("fails when one node returns secp256k1 exists=false", async () => {
      const nodes = makeKSNodes(3);
      mockRequestCheckKeyShareV2
        .mockResolvedValueOnce(successResponse(true, true))
        .mockResolvedValueOnce(successResponse(false, true))
        .mockResolvedValueOnce(successResponse(true, true));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
        expect(res.msg).toContain("KSNode2");
        expect(res.msg).toContain("secp256k1 keyshare does not exist");
      }
    });

    it("fails when one node returns ed25519 exists=false", async () => {
      const nodes = makeKSNodes(2);
      mockRequestCheckKeyShareV2
        .mockResolvedValueOnce(successResponse(true, true))
        .mockResolvedValueOnce(successResponse(true, false));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
        expect(res.msg).toContain("KSNode2");
        expect(res.msg).toContain("ed25519 keyshare does not exist");
      }
    });

    it("fails when a node returns error response", async () => {
      const nodes = makeKSNodes(2);
      mockRequestCheckKeyShareV2
        .mockResolvedValueOnce(successResponse(true, true))
        .mockResolvedValueOnce(errorResponse("node unavailable"));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
        expect(res.msg).toContain("node unavailable");
      }
    });

    it("returns all nodeIds on success (not just successful ones)", async () => {
      const nodes = makeKSNodes(3);
      mockRequestCheckKeyShareV2.mockResolvedValue(successResponse(true, true));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
      );

      expect(res.success).toBe(true);
      if (res.success) {
        // all-or-nothing returns all nodeIds
        expect(res.data.secp256k1?.nodeIds).toHaveLength(3);
        expect(res.data.ed25519?.nodeIds).toHaveLength(3);
      }
    });
  });

  // ── partial success mode (registrationThreshold set) ──────────────

  describe("partial success mode (with registrationThreshold)", () => {
    it("succeeds when success count meets threshold", async () => {
      const nodes = makeKSNodes(3);
      mockRequestCheckKeyShareV2
        .mockResolvedValueOnce(successResponse(true, true))
        .mockResolvedValueOnce(successResponse(true, true))
        .mockResolvedValueOnce(successResponse(false, false));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
        2, // registrationThreshold
      );

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.secp256k1?.nodeIds).toEqual(["node-1", "node-2"]);
        expect(res.data.ed25519?.nodeIds).toEqual(["node-1", "node-2"]);
      }
    });

    it("fails when secp256k1 success count is below threshold", async () => {
      const nodes = makeKSNodes(3);
      mockRequestCheckKeyShareV2
        .mockResolvedValueOnce(successResponse(true, true))
        .mockResolvedValueOnce(successResponse(false, true))
        .mockResolvedValueOnce(successResponse(false, true));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
        2,
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
        expect(res.msg).toContain("secp256k1: 1/3 nodes succeeded (need 2)");
      }
    });

    it("fails when ed25519 success count is below threshold", async () => {
      const nodes = makeKSNodes(3);
      mockRequestCheckKeyShareV2
        .mockResolvedValueOnce(successResponse(true, true))
        .mockResolvedValueOnce(successResponse(true, false))
        .mockResolvedValueOnce(successResponse(true, false));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
        2,
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
        expect(res.msg).toContain("ed25519: 1/3 nodes succeeded (need 2)");
      }
    });

    it("returns only successful nodeIds in partial success mode", async () => {
      const nodes = makeKSNodes(3);
      mockRequestCheckKeyShareV2
        .mockResolvedValueOnce(successResponse(true, true))
        .mockResolvedValueOnce(errorResponse("connection refused"))
        .mockResolvedValueOnce(successResponse(true, true));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
        2,
      );

      expect(res.success).toBe(true);
      if (res.success) {
        // only node-1 and node-3 succeeded
        expect(res.data.secp256k1?.nodeIds).toEqual(["node-1", "node-3"]);
        expect(res.data.ed25519?.nodeIds).toEqual(["node-1", "node-3"]);
      }
    });

    it("falls back to all-or-nothing when registrationThreshold is null", async () => {
      const nodes = makeKSNodes(2);
      mockRequestCheckKeyShareV2
        .mockResolvedValueOnce(successResponse(true, true))
        .mockResolvedValueOnce(successResponse(false, true));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
        null,
      );

      // null → usePartialSuccess = false → all-or-nothing → one failure = fail
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
      }
    });
  });

  // ── edge cases ────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles Promise rejection from a node", async () => {
      const nodes = makeKSNodes(3);
      mockRequestCheckKeyShareV2
        .mockResolvedValueOnce(successResponse(true, true))
        .mockRejectedValueOnce(new Error("ECONNREFUSED"))
        .mockResolvedValueOnce(successResponse(true, true));

      // all-or-nothing: rejection = failure
      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
        expect(res.msg).toContain("KSNode2");
      }
    });

    it("handles Promise rejection in partial success mode (above threshold)", async () => {
      const nodes = makeKSNodes(3);
      mockRequestCheckKeyShareV2
        .mockResolvedValueOnce(successResponse(true, true))
        .mockRejectedValueOnce(new Error("ECONNREFUSED"))
        .mockResolvedValueOnce(successResponse(true, true));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
        2,
      );

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.secp256k1?.nodeIds).toEqual(["node-1", "node-3"]);
        expect(res.data.ed25519?.nodeIds).toEqual(["node-1", "node-3"]);
      }
    });

    it("works with secp256k1-only wallets", async () => {
      const nodes = makeKSNodes(2);
      mockRequestCheckKeyShareV2.mockResolvedValue(
        successResponse(true, undefined),
      );

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK },
        nodes,
        AUTH_TYPE,
      );

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.secp256k1?.nodeIds).toEqual(["node-1", "node-2"]);
        expect(res.data.ed25519).toBeUndefined();
      }
    });

    it("works with ed25519-only wallets", async () => {
      const nodes = makeKSNodes(2);
      mockRequestCheckKeyShareV2.mockResolvedValue(
        successResponse(undefined, true),
      );

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
      );

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.ed25519?.nodeIds).toEqual(["node-1", "node-2"]);
        expect(res.data.secp256k1).toBeUndefined();
      }
    });

    it("per-curve partial failure: secp256k1 below threshold while ed25519 above", async () => {
      const nodes = makeKSNodes(3);
      // node-1: both exist
      // node-2: only ed25519 exists
      // node-3: only ed25519 exists
      mockRequestCheckKeyShareV2
        .mockResolvedValueOnce(successResponse(true, true))
        .mockResolvedValueOnce(successResponse(false, true))
        .mockResolvedValueOnce(successResponse(false, true));

      const res = await checkKeyShareFromKSNodesV2(
        TEST_EMAIL,
        { secp256k1: SECP256K1_PK, ed25519: ED25519_PK },
        nodes,
        AUTH_TYPE,
        2,
      );

      // secp256k1 has only 1 success, needs 2 → should fail
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
        expect(res.msg).toContain("secp256k1");
      }
    });
  });
});
