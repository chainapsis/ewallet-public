import { uploadToS3 } from "@oko-wallet/aws";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  GetCustomerApiKeysRequestSchema,
  GetCustomerApiKeysSuccessResponseSchema,
  GetCustomerInfoSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import { getAPIKeysByCustomerId } from "@oko-wallet/oko-pg-interface/api_keys";
import {
  getCustomerByUserId,
  updateCustomerInfo,
} from "@oko-wallet/oko-pg-interface/customers";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { APIKey } from "@oko-wallet/oko-types/ct_dashboard";
import type {
  Customer,
  UpdateCustomerInfoRequest,
  UpdateCustomerInfoResponse,
} from "@oko-wallet/oko-types/customers";
import { randomUUID } from "crypto";
import type { Response, Router } from "express";
import sharp from "sharp";

import { getCustomerApiKeys } from "./get_customer_api_keys";
import { getCustomerInfo } from "./get_customer_info";
import { updateCustomerInfoRoute } from "./update_customer_info";
import {
  type CustomerAuthenticatedRequest,
  customerJwtMiddleware,
} from "@oko-wallet-usrd-api/middleware/auth";
import { multerMiddleware } from "@oko-wallet-usrd-api/middleware/multer";
import { rateLimitMiddleware } from "@oko-wallet-usrd-api/middleware/rate_limit";

// export function setUserRoutes(router: Router) {
//   router.post("/customer/info", customerJwtMiddleware, getCustomerInfo);
//
//   router.post("/customer/api_keys", customerJwtMiddleware, getCustomerApiKeys);
//
//   router.post(
//     "/customer/update_info",
//     rateLimitMiddleware({ windowSeconds: 10 * 60, maxRequests: 20 }),
//     customerJwtMiddleware,
//     multerMiddleware,
//     updateCustomerInfoRoute,
//   );
// }
