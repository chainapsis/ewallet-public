import type { CurveType } from "@oko-wallet/oko-types/crypto";

export type OkoWalletMsgExportDisplayResize = {
  target: "oko_user_dashboard";
  msg_type: "__export_display_resize__";
  payload: { height: number; key_type: CurveType | null };
};

export type OkoWalletMsgExportDisplayError = {
  target: "oko_user_dashboard";
  msg_type: "__export_display_error__";
  payload: { key_type: CurveType | null };
};

export type OkoWalletMsgExportDisplayCopy = {
  target: "oko_user_dashboard";
  msg_type: "__export_display_copy__";
  payload: { key_type: CurveType | null };
};

export type OkoWalletMsgExportDisplayCopyError = {
  target: "oko_user_dashboard";
  msg_type: "__export_display_copy_error__";
  payload: { key_type: CurveType | null };
};
