import type {
  OperationType,
  ApiName,
} from "@oko-wallet/ksn-interface/commit_reveal";

export const ALLOWED_APIS = {
  sign_up: ["register"],
  sign_in: ["get_key_shares", "reshare", "register"],
  add_ed25519: ["get_key_shares", "reshare", "register", "register_ed25519"],
};

export function isApiAllowed(
  operationType: OperationType,
  apiName: ApiName,
): boolean {
  return ALLOWED_APIS[operationType].includes(apiName);
}
