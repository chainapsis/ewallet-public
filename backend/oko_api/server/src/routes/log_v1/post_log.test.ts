import { jest } from "@jest/globals";
import request from "supertest";

const mockIngestLog = jest.fn();

await jest.unstable_mockModule("@oko-wallet-api/api/log", () => ({
  ingestLog: (body: any, logger: any) => mockIngestLog(body, logger),
}));

// Dynamically import after jest.unstable_mockModule to apply ESM mocks correctly
const { makeApp } = await import("@oko-wallet-api/testing/app");

describe("log_route_test", () => {
  let app: any;

  beforeAll(() => {
    app = makeApp({
      ES_URL: "",
      ES_INDEX: "",
      ES_USERNAME: "",
      ES_PASSWORD: "",
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /log/v1", () => {
    const endpoint = "/log/v1";

    const validBody = {
      level: "info" as const,
      message: "Test message",
      timestamp: new Date().toISOString(),
      clientInfo: {
        userAgent: "jest",
        platform: "test",
        screen: { width: 1920, height: 1080 },
      },
      session: {
        sessionId: "sess-123",
        pageUrl: "https://example.com",
        email: "user@example.com",
        customerId: "cust-1",
      },
      meta: { foo: "bar" },
    };

    it("should return 200 when ingestLog succeeds", async () => {
      const fakeIngestedAt = new Date().toISOString();
      mockIngestLog.mockReturnValue({
        success: true,
        data: { ingestedAt: fakeIngestedAt },
      });

      const response = await request(app).post(endpoint).send(validBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: { ingestedAt: fakeIngestedAt },
      });
      expect(mockIngestLog).toHaveBeenCalledTimes(1);
      expect(mockIngestLog.mock.calls[0][0]).toMatchObject({
        level: "info",
        message: "Test message",
      });
    });

    it("should return 400 when ingestLog returns INVALID_LOG", async () => {
      mockIngestLog.mockReturnValue({
        success: false,
        code: "INVALID_LOG",
        msg: "invalid log payload",
      });

      const response = await request(app)
        .post(endpoint)
        .send({ message: "bad" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        code: "INVALID_LOG",
        msg: "invalid log payload",
      });
      expect(mockIngestLog).toHaveBeenCalledTimes(1);
    });

    it("should return 500 when ingestLog returns UNKNOWN_ERROR", async () => {
      mockIngestLog.mockReturnValue({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "unexpected failure",
      });

      const response = await request(app).post(endpoint).send(validBody);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "unexpected failure",
      });
      expect(mockIngestLog).toHaveBeenCalledTimes(1);
    });

    it("should include rate limit headers in successful response", async () => {
      mockIngestLog.mockReturnValue({
        success: true,
        data: { ingestedAt: new Date().toISOString() },
      });

      const response = await request(app).post(endpoint).send(validBody);

      expect(response.status).toBe(200);
      expect(response.headers["ratelimit-limit"]).toBeDefined();
      expect(response.headers["ratelimit-remaining"]).toBeDefined();
      expect(response.headers["ratelimit-reset"]).toBeDefined();
    });
  });
});
