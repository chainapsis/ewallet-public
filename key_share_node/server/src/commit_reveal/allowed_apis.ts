import type {
  OperationType,
  ApiName,
} from "@oko-wallet/ksn-interface/commit_reveal";

export const ALLOWED_APIS: Record<OperationType, ApiName[]> = {
  sign_up: ["register"],
  sign_in: ["get_key_shares"],
  reshare: ["get_key_shares", "reshare"],
  add_ed25519: ["register_ed25519", "get_key_shares"],
  add_ed25519_with_reshare: ["register_ed25519", "get_key_shares", "reshare"],
};

export const FINAL_APIS: Record<OperationType, ApiName> = {
  sign_up: "register",
  sign_in: "get_key_shares",
  reshare: "reshare",
  add_ed25519: "get_key_shares",
  add_ed25519_with_reshare: "reshare",
};

export function isApiAllowed(
  operationType: OperationType,
  apiName: ApiName,
): boolean {
  return ALLOWED_APIS[operationType].includes(apiName);
}

export function isFinalApi(
  operationType: OperationType,
  apiName: ApiName,
): boolean {
  return FINAL_APIS[operationType] === apiName;
}
