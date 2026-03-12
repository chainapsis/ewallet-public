import express from "express";
import request from "supertest";

import { rateLimitMiddleware } from "./rate_limit";

describe("rate_limit_test", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
  });

  describe("rateLimitMiddleware", () => {
    it("should allow normal requests", async () => {
      app.use(rateLimitMiddleware({ windowSeconds: 30, maxRequests: 10 }));
      app.get("/test", (_req, res) => res.json({ success: true }));

      const response = await request(app).get("/test");
      expect(response.status).toBe(200);
    });

    it("should include rate limit headers", async () => {
      app.use(rateLimitMiddleware({ windowSeconds: 30, maxRequests: 10 }));
      app.get("/test", (_req, res) => res.json({ success: true }));

      const response = await request(app).get("/test");
      expect(response.headers["ratelimit-limit"]).toBeDefined();
      expect(response.headers["ratelimit-remaining"]).toBeDefined();
      expect(response.headers["ratelimit-reset"]).toBeDefined();
    });

    it("should block requests when limit exceeded", async () => {
      app.use(rateLimitMiddleware({ windowSeconds: 1, maxRequests: 1 }));
      app.get("/test", (_req, res) => res.json({ success: true }));

      await request(app).get("/test");
      const response = await request(app).get("/test");

      expect(response.status).toBe(429);
      expect(response.body.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("should include headers when blocked", async () => {
      app.use(rateLimitMiddleware({ windowSeconds: 1, maxRequests: 1 }));
      app.get("/test", (_req, res) => res.json({ success: true }));

      await request(app).get("/test");
      const response = await request(app).get("/test");

      expect(response.status).toBe(429);
      expect(response.headers["ratelimit-remaining"]).toBe("0");
    });

    it("should work with strict limits", async () => {
      app.use(rateLimitMiddleware({ windowSeconds: 1, maxRequests: 1 }));
      app.get("/test", (_req, res) => res.json({ success: true }));

      const response1 = await request(app).get("/test");
      expect(response1.status).toBe(200);

      const response2 = await request(app).get("/test");
      expect(response2.status).toBe(429);
    });

    it("should work with generous limits", async () => {
      app.use(rateLimitMiddleware({ windowSeconds: 3600, maxRequests: 1000 }));
      app.get("/test", (_req, res) => res.json({ success: true }));

      for (let i = 0; i < 5; i++) {
        const response = await request(app).get("/test");
        expect(response.status).toBe(200);
      }
    });

    it("should include time in error message", async () => {
      const windowSeconds = 45;
      app.use(rateLimitMiddleware({ windowSeconds, maxRequests: 1 }));
      app.get("/test", (_req, res) => res.json({ success: true }));

      await request(app).get("/test");
      const response = await request(app).get("/test");

      expect(response.body.msg).toContain(`${windowSeconds} seconds`);
    });
  });
});
