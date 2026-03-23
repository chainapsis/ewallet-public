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

const rateLimit = rateLimitMiddleware({
  windowSeconds: 60,
  maxRequests: 30,
});

export function makeCustomerRouter() {
  const router = express.Router();

  router.post("/customer/auth/forgot-password", rateLimit, forgotPassword);
  router.post("/customer/auth/verify-reset-code", rateLimit, verifyResetCode);
  router.post(
    "/customer/auth/reset-password-confirm",
    rateLimit,
    resetPasswordConfirm,
  );
  router.post("/customer/auth/send-code", rateLimit, sendCode);
  router.post("/customer/auth/verify-login", rateLimit, verifyLogin);
  router.post("/customer/auth/signin", rateLimit, signIn);
  router.post(
    "/customer/auth/change-password",
    rateLimit,
    customerJwtMiddleware,
    changePassword,
  );

  router.post("/customer/info", customerJwtMiddleware, getCustomerInfo);
  router.post("/customer/api_keys", customerJwtMiddleware, getCustomerApiKeys);

  router.post(
    "/customer/api_keys/create",
    rateLimit,
    customerJwtMiddleware,
    createApiKey,
  );
  router.post(
    "/customer/api_keys/delete",
    rateLimit,
    customerJwtMiddleware,
    deleteApiKey,
  );
  router.post(
    "/customer/update_info",
    rateLimit,
    customerJwtMiddleware,
    customerLogoUploadMiddleware,
    updateCustomerInfoRoute,
  );

  router.post("/customer/team/validate_invitation", validateInvitation);
  router.post("/customer/team/accept_invitation", rateLimit, acceptInvitation);

  router.post(
    "/customer/team/get_members",
    customerJwtMiddleware,
    resolveTeamMember,
    getTeamMembers,
  );

  router.post(
    "/customer/team/invite_member",
    rateLimit,
    customerJwtMiddleware,
    resolveTeamMember,
    requireAdmin,
    inviteTeamMember,
  );
  router.post(
    "/customer/team/resend_invitation",
    rateLimit,
    customerJwtMiddleware,
    resolveTeamMember,
    requireAdmin,
    resendInvitation,
  );
  router.post(
    "/customer/team/cancel_invitation",
    rateLimit,
    customerJwtMiddleware,
    resolveTeamMember,
    requireAdmin,
    cancelInvitation,
  );
  router.post(
    "/customer/team/update_member_role",
    rateLimit,
    customerJwtMiddleware,
    resolveTeamMember,
    requireAdmin,
    updateMemberRole,
  );
  router.post(
    "/customer/team/remove_member",
    rateLimit,
    customerJwtMiddleware,
    resolveTeamMember,
    requireAdmin,
    removeTeamMember,
  );
  router.post(
    "/customer/team/leave",
    rateLimit,
    customerJwtMiddleware,
    resolveTeamMember,
    leaveTeam,
  );

  return router;
}
