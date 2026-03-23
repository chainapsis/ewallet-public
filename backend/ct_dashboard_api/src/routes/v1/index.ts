import express from "express";

import { acceptInvitation } from "./accept_invitation";
import { cancelInvitation } from "./cancel_invitation";
import { changePassword } from "./change_password";
import { createApiKey } from "./create_api_key";
import { deleteApiKey } from "./delete_api_key";
import { forgotPassword } from "./forgot_password";
import { getCustomerApiKeys } from "./get_customer_api_keys";
import { getCustomerInfo } from "./get_customer_info";
import { getTeamMembers } from "./get_team_members";
import { inviteTeamMember } from "./invite_team_member";
import { leaveTeam } from "./leave_team";
import { removeTeamMember } from "./remove_team_member";
import { resendInvitation } from "./resend_invitation";
import { resetPasswordConfirm } from "./reset_password_confirm";
import { sendCode } from "./send_code";
import { signIn } from "./signin";
import { updateCustomerInfoRoute } from "./update_customer_info";
import { updateMemberRole } from "./update_member_role";
import { validateInvitation } from "./validate_invitation";
import { verifyLogin } from "./verify_login";
import { verifyResetCode } from "./verify_reset_code";
import {
  customerJwtMiddleware,
  requireAdmin,
  resolveTeamMember,
} from "@oko-wallet-ctd-api/middleware/auth";
import { customerLogoUploadMiddleware } from "@oko-wallet-ctd-api/middleware/multer";
import { rateLimitMiddleware } from "@oko-wallet-ctd-api/middleware/rate_limit";

export function makeCustomerRouter() {
  const router = express.Router();

  router.use(rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }));

  router.post(
    "/customer/auth/forgot-password",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    forgotPassword,
  );

  router.post(
    "/customer/auth/verify-reset-code",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    verifyResetCode,
  );

  router.post(
    "/customer/auth/reset-password-confirm",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    resetPasswordConfirm,
  );

  router.post(
    "/customer/auth/send-code",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    sendCode,
  );

  router.post(
    "/customer/auth/verify-login",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    verifyLogin,
  );

  router.post(
    "/customer/auth/signin",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    signIn,
  );

  router.post(
    "/customer/auth/change-password",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    customerJwtMiddleware,
    changePassword,
  );

  router.post("/customer/info", customerJwtMiddleware, getCustomerInfo);

  router.post("/customer/api_keys", customerJwtMiddleware, getCustomerApiKeys);

  router.post(
    "/customer/api_keys/create",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    customerJwtMiddleware,
    createApiKey,
  );

  router.post(
    "/customer/api_keys/delete",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    customerJwtMiddleware,
    deleteApiKey,
  );

  // ─── Team (public) ─────────────────────────────────────────────

  router.post("/customer/team/validate_invitation", validateInvitation);
  router.post("/customer/team/accept_invitation", acceptInvitation);

  // ─── Team (authenticated) ─────────────────────────────────────

  router.post(
    "/customer/team/get_members",
    customerJwtMiddleware,
    resolveTeamMember,
    getTeamMembers,
  );

  router.post(
    "/customer/team/invite_member",
    customerJwtMiddleware,
    resolveTeamMember,
    requireAdmin,
    inviteTeamMember,
  );

  router.post(
    "/customer/team/resend_invitation",
    customerJwtMiddleware,
    resolveTeamMember,
    requireAdmin,
    resendInvitation,
  );

  router.post(
    "/customer/team/cancel_invitation",
    customerJwtMiddleware,
    resolveTeamMember,
    requireAdmin,
    cancelInvitation,
  );

  router.post(
    "/customer/team/update_member_role",
    customerJwtMiddleware,
    resolveTeamMember,
    requireAdmin,
    updateMemberRole,
  );

  router.post(
    "/customer/team/remove_member",
    customerJwtMiddleware,
    resolveTeamMember,
    requireAdmin,
    removeTeamMember,
  );

  router.post(
    "/customer/team/leave",
    customerJwtMiddleware,
    resolveTeamMember,
    leaveTeam,
  );

  router.post(
    "/customer/update_info",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    customerJwtMiddleware,
    customerLogoUploadMiddleware,
    updateCustomerInfoRoute,
  );

  return router;
}
