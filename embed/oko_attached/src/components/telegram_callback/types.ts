export type HandleTelegramCallbackError =
  | { type: "login_canceled_by_user" }
  | { type: "opener_window_not_exists" }
  | { type: "params_not_sufficient" }
  | { type: "msg_pass_fail"; error: string }
  | { type: "wrong_ack_type"; msg_type: string };
