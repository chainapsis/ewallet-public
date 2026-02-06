import type {
  OperationType,
  ApiName,
} from "@oko-wallet/oko-types/commit_reveal";

export const ALLOWED_APIS = {
  sign_up: ["keygen"],
  sign_in: ["signin"],
  reshare: ["signin", "reshare"],
  add_ed25519: ["signin", "keygen_ed25519"],
  add_ed25519_with_reshare: ["signin", "keygen_ed25519", "reshare"],
};

export const FINAL_APIS = {
  sign_up: "keygen",
  sign_in: "signin",
  reshare: "reshare",
  add_ed25519: "keygen_ed25519",
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
