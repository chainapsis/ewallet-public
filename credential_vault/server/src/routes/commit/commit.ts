import type { Router, Request, Response } from "express";
import type { CommitIdTokenRequest } from "@keplr-ewallet/credential-vault-interface";

import { commitIdTokenWithUserSessionPublicKey } from "@keplr-ewallet-cv-server/apis/commit";
import {
  type AuthenticatedRequest,
  bearerTokenMiddleware,
} from "@keplr-ewallet-cv-server/middlewares";

export function setCommitRoutes(router: Router) {
  router.post(
    "/id-token",
    bearerTokenMiddleware,
    async (req: Request, res: Response) => {
      try {
        const commitIdTokenRequest = req.body as CommitIdTokenRequest;
        const state = req.app.locals as any;

        const db = state.db;
        const result = await commitIdTokenWithUserSessionPublicKey(
          db,
          commitIdTokenRequest,
        );

        if (result.success) {
          return res.status(200).json({ success: true });
        } else {
          return res.status(400).json({
            success: false,
            error: result.err,
          });
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: String(error),
          },
        });
      }
    },
  );
}
