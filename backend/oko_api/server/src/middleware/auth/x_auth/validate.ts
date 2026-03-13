// import { getXUserInfo } from "@oko-wallet/social-login-api";

import type { SocialLoginXVerifyUserResponse } from "@oko-wallet/oko-types/social_login";
import type { Result } from "@oko-wallet/stdlib-js";

export async function validateAccessTokenOfX(
  accessToken: string,
): Promise<Result<SocialLoginXVerifyUserResponse, string>> {
  try {
    const res = await getXUserInfo(accessToken);
    if (!res.success) {
      if (res.err.status === 429) {
        return {
          success: false,
          err: "Too Many Requests",
        };
      }
      return {
        success: false,
        err: `Invalid token: ${res.err.text}`,
      };
    }

    return {
      success: true,
      data: res.data,
    };
  } catch (error: any) {
    return {
      success: false,
      err: `Token validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// TODO: @elden temporary copy
// import type { Result } from "@oko-wallet/stdlib-js";
// import type { SocialLoginXVerifyUserResponse } from "@oko-wallet/oko-types/social_login";

// import { X_USER_INFO_URL } from "../constants/x";

const X_USER_INFO_URL = "https://api.x.com/2/users/me";

export async function getXUserInfo(accessToken: string): Promise<
  Result<
    SocialLoginXVerifyUserResponse,
    {
      status: number;
      text: string;
    }
  >
> {
  const res = await fetch(X_USER_INFO_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.ok) {
    return {
      success: true,
      data: (await res.json()).data,
    };
  }

  return {
    success: false,
    err: {
      status: res.status,
      text: await res.text(),
    },
  };
}
