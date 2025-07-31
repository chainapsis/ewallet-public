import { Router, type Response } from "express";
import type {
  EwalletApiResponse,
  GetKeyShareRequestBody,
  GetKeyShareResponse,
  RegisterKeyShareBody,
} from "@keplr-ewallet/credential-vault-interface";

import {
  getKeyShare,
  registerKeyShare,
} from "@keplr-ewallet-cv-server/apis/key_share";
import {
  bearerTokenMiddleware,
  type AuthenticatedRequest,
} from "@keplr-ewallet-cv-server/middlewares";
import type { ErrorCode } from "@keplr-ewallet-cv-server/error";

export function setKeysharesRoutes(router: Router) {
  /**
   * @swagger
   * /keyshare/v1/register:
   *   post:
   *     tags:
   *       - Key Share
   *     summary: Register a new key share
   *     description: Register a new key share for the authenticated user.
   *     security:
   *       - googleAuth: []
   *     parameters:
   *       - in: header
   *         name: Authorization
   *         required: true
   *         description: Google OAuth token (Bearer token format)
   *         schema:
   *           type: string
   *           pattern: '^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$'
   *           example: 'Bearer eyJhbGciOiJIUzI1NiIs...'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterKeyShareBody'
   *     responses:
   *       200:
   *         description: Successfully registered key share
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/SuccessResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: "null"
   *       401:
   *         description: Unauthorized - Invalid or missing bearer token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               code: UNAUTHORIZED
   *               msg: Unauthorized
   *       409:
   *         description: Conflict - Public key already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               code: DUPLICATE_PUBLIC_KEY
   *               msg: "Duplicate public key"
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               code: UNKNOWN_ERROR
   *               msg: "{error message}"
   */
  router.post(
    "/register",
    bearerTokenMiddleware,
    async (
      req: AuthenticatedRequest<RegisterKeyShareBody>,
      res: Response<EwalletApiResponse<void>>,
    ) => {
      const googleUser = res.locals.google_user;
      const state = req.app.locals as any;
      const body = req.body;

      const registerKeyShareRes = await registerKeyShare(state.db, {
        email: googleUser.email,
        curve_type: body.curve_type,
        public_key: body.public_key,
        enc_share: body.enc_share,
      });
      if (registerKeyShareRes.success === false) {
        return res
          .status(mapKeyShareErrorCodeToStatus(registerKeyShareRes.err.code))
          .json({
            success: false,
            code: registerKeyShareRes.err.code,
            msg: registerKeyShareRes.err.message,
          });
      }

      return res.status(200).json({
        success: true,
        data: void 0,
      });
    },
  );

  /**
   * @swagger
   * /keyshare/v1/:
   *   post:
   *     tags:
   *       - Key Share
   *     summary: Get a key share
   *     description: Retrieve a key share for the authenticated user
   *     security:
   *       - googleAuth: []
   *     parameters:
   *       - in: header
   *         name: Authorization
   *         required: true
   *         description: Google OAuth token (Bearer token format)
   *         schema:
   *           type: string
   *           pattern: '^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$'
   *           example: 'Bearer eyJhbGciOiJIUzI1NiIs...'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/GetKeyShareRequestBody'
   *     responses:
   *       200:
   *         description: Successfully retrieved key share
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/SuccessResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/GetKeyShareResponse'
   *       401:
   *         description: Unauthorized - Invalid or missing bearer token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               code: UNAUTHORIZED
   *               msg: Unauthorized
   *       404:
   *         description: Not found - User, wallet or key share not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               userNotFound:
   *                 value:
   *                   success: false
   *                   code: USER_NOT_FOUND
   *                   msg: "User not found"
   *               walletNotFound:
   *                 value:
   *                   success: false
   *                   code: WALLET_NOT_FOUND
   *                   msg: "Wallet not found"
   *               keyShareNotFound:
   *                 value:
   *                   success: false
   *                   code: KEY_SHARE_NOT_FOUND
   *                   msg: "Key share not found"
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               code: UNKNOWN_ERROR
   *               msg: "{error message}"
   */
  router.post(
    "/",
    bearerTokenMiddleware,
    async (
      req: AuthenticatedRequest<GetKeyShareRequestBody>,
      res: Response<EwalletApiResponse<GetKeyShareResponse>>,
    ) => {
      const googleUser = res.locals.google_user;
      const state = req.app.locals as any;

      const getKeyShareRes = await getKeyShare(state.db, {
        email: googleUser.email,
        public_key: req.body.public_key,
      });
      if (getKeyShareRes.success === false) {
        return res
          .status(mapKeyShareErrorCodeToStatus(getKeyShareRes.err.code))
          .json({
            success: false,
            code: getKeyShareRes.err.code,
            msg: getKeyShareRes.err.message,
          });
      }

      return res.status(200).json({
        success: true,
        data: getKeyShareRes.data,
      });
    },
  );
}

function mapKeyShareErrorCodeToStatus(code: ErrorCode): number {
  const KeyShareErrorCodeToStatus: Partial<Record<ErrorCode, number>> = {
    DUPLICATE_PUBLIC_KEY: 409,
    USER_NOT_FOUND: 404,
    WALLET_NOT_FOUND: 404,
    UNAUTHORIZED: 401,
    KEY_SHARE_NOT_FOUND: 404,
    UNKNOWN_ERROR: 500,
  };

  return KeyShareErrorCodeToStatus[code] ?? 500;
}
