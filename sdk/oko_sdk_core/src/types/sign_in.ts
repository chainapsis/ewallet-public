export type OAuthSignInError =
  | {
      type: "origin_not_registered";
    }
  | {
      type: "key_share_combine_fail";
      error: string;
    }
  | {
      type: "check_user_request_fail";
      error: string;
    }
  | {
      type: "sign_in_request_fail";
      error: string;
    }
  | {
      type: "nonce_missing";
    }
  | {
      type: "PKCE_missing";
    }
  // Gating and service-state errors based on SSS plan
  | {
      // Global active nodes below SSS threshold → service suspended
      type: "active_nodes_below_threshold";
    }
  | {
      type: "reshare_fail";
      error: string;
    }
  | { type: "invalid_msg_type"; msg_type: string }
  | { type: "vendor_token_verification_failed" }
  | { type: "api_key_missing" }
  | { type: "wallet_not_initialized" }
  | { type: "insufficient_shares" }
  | { type: "signup_disabled" }
  | {
      type: "unknown";
      error: string;
    };
