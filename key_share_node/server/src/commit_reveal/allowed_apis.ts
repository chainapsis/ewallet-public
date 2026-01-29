import type {
  OperationType,
  ApiName,
} from "@oko-wallet/ksn-interface/commit_reveal";

export const ALLOWED_APIS: Record<OperationType, ApiName[]> = {
  sign_in: ["get_key_shares"],
  sign_up: ["register"],
  sign_in_reshare: ["get_key_shares", "reshare"],
  register_reshare: ["get_key_shares", "reshare_register"],
  add_ed25519: ["register_ed25519", "get_key_shares"],
};

export const FINAL_APIS: Record<OperationType, ApiName[]> = {
  sign_in: ["get_key_shares"],
  sign_up: ["register"],
  sign_in_reshare: ["reshare"],
  register_reshare: ["reshare_register"],
  add_ed25519: ["get_key_shares"],
};

export function isApiAllowed(
  operationType: OperationType,
  apiName: ApiName,
): boolean {
  return (ALLOWED_APIS[operationType]).includes(apiName);
}

export function isFinalApi(
  operationType: OperationType,
  apiName: ApiName,
): boolean {
  return (FINAL_APIS[operationType]).includes(apiName);
}
