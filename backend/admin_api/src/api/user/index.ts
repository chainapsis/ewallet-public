import { comparePassword } from "@oko-wallet/crypto-js";
import { getAdminByEmail } from "@oko-wallet/oko-pg-interface/admin_users";
import type {
  AdminLoginRequest,
  AdminLoginResponse,
  AdminLogoutResponse,
} from "@oko-wallet/oko-types/admin";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Pool } from "pg";

import { generateAdminToken } from "@oko-wallet-admin-api/auth";

export async function login(
  db: Pool,
  body: AdminLoginRequest,
  jwt_config: {
    secret: string;
    expires_in: string;
  },
): Promise<OkoApiResponse<AdminLoginResponse>> {
  try {
    const getAdminRes = await getAdminByEmail(db, body.email);
    if (getAdminRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get admin by email: ${getAdminRes.err}`,
      };
    }

    const admin = getAdminRes.data;
    if (admin === null) {
      return {
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: `Email not found`,
      };
    }

    const isValidPassword = await comparePassword(
      body.password,
      admin.password_hash,
    );
    if (isValidPassword === false) {
      return {
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: `Password is incorrect`,
      };
    }

    const generateAdminTokenRes = generateAdminToken({
      user_id: admin.user_id,
      role: admin.role,
      jwt_config: {
        secret: jwt_config.secret,
        expires_in: jwt_config.expires_in,
      },
    });
    if (generateAdminTokenRes.success === false) {
      return {
        success: false,
        code: "FAILED_TO_GENERATE_TOKEN",
        msg: `Failed to generate authentication token: ${generateAdminTokenRes.err}`,
      };
    }

    const token = generateAdminTokenRes.data.token;
    if (!token) {
      return {
        success: false,
        code: "FAILED_TO_GENERATE_TOKEN",
        msg: `Failed to generate authentication token: token is null`,
      };
    }

    return {
      success: true,
      data: {
        admin: {
          user_id: admin.user_id,
          role: admin.role,
        },
        token,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to login: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function logout(
  _db: Pool,
  token?: string,
): Promise<OkoApiResponse<AdminLogoutResponse>> {
  try {
    if (token) {
      return {
        success: true,
        data: {
          message:
            "Logged out successfully. Please remove the token from your client.",
        },
      };
    } else {
      return {
        success: true,
        data: {
          message: "Logged out successfully.",
        },
      };
    }
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to logout: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
