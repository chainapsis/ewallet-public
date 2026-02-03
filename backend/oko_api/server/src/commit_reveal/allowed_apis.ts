import type {
  OperationType,
  ApiName,
} from "@oko-wallet/oko-types/commit_reveal";

export const ALLOWED_APIS = {
  sign_up: ["keygen"],
  sign_in: ["signin", "reshare"],
  add_ed25519: ["signin", "reshare", "keygen_ed25519"],
};

export function isApiAllowed(
  operationType: OperationType,
  apiName: ApiName,
): boolean {
  return ALLOWED_APIS[operationType].includes(apiName);
}
