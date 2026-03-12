import { jest } from "@jest/globals";
import { healthCheckKSNode } from "@oko-wallet/admin-api/api";
import { insertKSNode } from "@oko-wallet/oko-pg-interface/ks_nodes";
import { createPgConn } from "@oko-wallet/postgres-lib";
import type { Pool } from "pg";

import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";

describe("ks_node_health_check_test", () => {
  let pool: Pool;

  beforeAll(async () => {
    const config = testPgConfig;
    const createPostgresRes = await createPgConn({
      database: config.database,
      host: config.host,
      password: config.password,
      user: config.user,
      port: config.port,
      ssl: config.ssl,
    });

    if (createPostgresRes.success === false) {
      console.error(createPostgresRes.err);
      throw new Error("Failed to create postgres database");
    }

    pool = createPostgresRes.data;
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    await resetPgDatabase(pool);

    globalThis.fetch = jest.fn() as any;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("processHealthCheckNodes", () => {
    it("should process health checks for multiple ks nodes", async () => {
      // Create multiple ks nodes with different scenarios
      const ksNodes = [
        {
          name: "Healthy-1",
          url: "http://localhost:3001",
          expectedStatus: true,
        },
        {
          name: "Unhealthy-1",
          url: "http://localhost:3002",
          expectedStatus: false,
        },
        {
          name: "Healthy-2",
          url: "http://localhost:3003",
          expectedStatus: true,
        },
        {
          name: "Unhealthy-2",
          url: "http://localhost:3004",
          expectedStatus: false,
        },
        {
          name: "Healthy-3",
          url: "http://localhost:3005",
          expectedStatus: true,
        },
      ];

      for (const ksNode of ksNodes) {
        const ksNodeRes = await insertKSNode(pool, ksNode.name, ksNode.url);
        expect(ksNodeRes.success).toBe(true);
      }

      // Mock fetch to return different results for each ks node
      let callCount = 0;
      (globalThis.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1 || callCount === 3 || callCount === 5) {
          return Promise.resolve({
            status: 200,
            text: async () => "Ok",
          });
        } else {
          return Promise.resolve({
            status: 500,
            text: async () => "Error",
          });
        }
      });

      const result = await healthCheckKSNode(pool);

      expect(result.success).toBe(true);
      if (result.success === false) {
        throw new Error("Failed to process health checks");
      }
      expect(result.data).toBe(5);

      expect(globalThis.fetch).toHaveBeenCalledTimes(5);
      expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost:3001/");
      expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost:3002/");
      expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost:3003/");
      expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost:3004/");
      expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost:3005/");

      const healthChecksRes = await pool.query(
        "SELECT khc.*, k.node_name FROM ks_node_health_checks khc " +
          "JOIN key_share_nodes k ON khc.node_id = k.node_id " +
          "ORDER BY k.node_name",
      );
      expect(healthChecksRes.rows.length).toBe(5);

      for (const ksNode of ksNodes) {
        const ksNodeCheck = healthChecksRes.rows.find(
          (row) => row.node_name === ksNode.name,
        );
        expect(ksNodeCheck).toBeDefined();

        const expectedStatus = ksNode.expectedStatus ? "HEALTHY" : "UNHEALTHY";
        expect(ksNodeCheck.status).toBe(expectedStatus);
      }

      const healthyCount = healthChecksRes.rows.filter(
        (row) => row.status === "HEALTHY",
      ).length;
      const unhealthyCount = healthChecksRes.rows.filter(
        (row) => row.status === "UNHEALTHY",
      ).length;

      expect(healthyCount).toBe(3);
      expect(unhealthyCount).toBe(2);
    });

    it("should handle empty ks node list", async () => {
      const result = await healthCheckKSNode(pool);

      expect(result.success).toBe(true);
      if (result.success === false) {
        throw new Error("Failed to process health checks");
      }
      expect(result.data).toBe(0);

      expect(globalThis.fetch).not.toHaveBeenCalled();

      const healthChecksRes = await pool.query(
        "SELECT COUNT(*) FROM ks_node_health_checks",
      );
      expect(parseInt(healthChecksRes.rows[0].count, 10)).toBe(0);
    });

    it("should handle requestHealthCheck failures", async () => {
      const ksNodeRes = await insertKSNode(
        pool,
        "Test KS Node",
        "http://localhost:3001",
      );
      expect(ksNodeRes.success).toBe(true);

      (globalThis.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          status: 500,
          text: async () => "Error",
        }),
      );

      const result = await healthCheckKSNode(pool);

      expect(result.success).toBe(true);
      if (result.success === false) {
        throw new Error("Failed to process health checks");
      }
      expect(result.data).toBe(1);

      const healthChecksRes = await pool.query(
        "SELECT khc.*, k.node_name FROM ks_node_health_checks khc " +
          "JOIN key_share_nodes k ON khc.node_id = k.node_id " +
          "ORDER BY k.node_name",
      );
      expect(healthChecksRes.rows.length).toBe(1);
      expect(healthChecksRes.rows[0].node_name).toBe("Test KS Node");
      expect(healthChecksRes.rows[0].status).toBe("UNHEALTHY");
    });
  });
});
