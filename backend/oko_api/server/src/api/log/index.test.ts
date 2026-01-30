import { jest } from "@jest/globals";
import type { Logger } from "winston";

import { ingestLog } from ".";

describe("log_test", () => {
  const makeMockLogger = () =>
    ({
      log: jest.fn(),
    }) as unknown as Logger;

  describe("ingestLog", () => {
    it("logs valid input and returns ingestedAt", () => {
      const clientLogger = makeMockLogger();

      const validLog = {
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

      const res = ingestLog(validLog, clientLogger);

      expect(res.success).toBe(true);
      if (res.success === false) {
        throw new Error(res.msg);
      }
      expect(typeof res.data.ingestedAt).toBe("string");

      expect((clientLogger as any).log).toHaveBeenCalledTimes(1);
      const loggedArg = (clientLogger as any).log.mock.calls[0][0];
      expect(loggedArg.level).toBe("info");
      expect(loggedArg.message).toBe("Test message");
      expect(loggedArg.clientInfo).toEqual({
        userAgent: "jest",
        platform: "test",
        screen: { width: 1920, height: 1080 },
      });
      expect(loggedArg.meta).toEqual({ foo: "bar" });
      expect(typeof loggedArg.ingestedAt).toBe("string");
      expect(loggedArg.ingestedAt).toBe(res.data.ingestedAt);
    });

    it("returns INVALID_LOG and does not log when input is invalid", () => {
      const clientLogger = makeMockLogger();

      // Missing required clientInfo
      const invalidLog: any = {
        level: "info",
        message: "No client info",
      };

      const res = ingestLog(invalidLog, clientLogger);

      expect(res.success).toBe(false);
      if (res.success === true) {
        throw new Error("success should be false");
      }
      expect(res.code).toBe("INVALID_LOG");
      expect(typeof res.msg).toBe("string");
      expect((clientLogger as any).log).not.toHaveBeenCalled();
    });

    it("returns UNKNOWN_ERROR when logger throws", () => {
      const clientLogger = makeMockLogger();
      (clientLogger as any).log.mockImplementation(() => {
        throw new Error("logger failure");
      });

      const validLog = {
        level: "error" as const,
        message: "Will throw",
        timestamp: new Date().toISOString(),
        clientInfo: {
          userAgent: "jest",
          platform: "test",
          screen: { width: 1, height: 1 },
        },
      };

      const res = ingestLog(validLog, clientLogger);

      expect(res.success).toBe(false);
      if (res.success === true) {
        throw new Error("success should be false");
      }
      expect(res.code).toBe("UNKNOWN_ERROR");
      expect(typeof res.msg).toBe("string");
      expect((clientLogger as any).log).toHaveBeenCalledTimes(1);
    });
  });
});
