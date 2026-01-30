import type {
  OperationType,
  ApiName,
} from "@oko-wallet/oko-types/commit_reveal";

export const ALLOWED_APIS = {
  sign_in: ["signin"],
  sign_up: ["keygen"],
  sign_in_reshare: ["signin", "reshare"],
  add_ed25519: ["keygen_ed25519"],
};

export const FINAL_APIS = {
  sign_in: ["signin"],
  sign_up: ["keygen"],
  sign_in_reshare: ["reshare"],
  add_ed25519: ["keygen_ed25519"],
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
  return FINAL_APIS[operationType].includes(apiName);
}
