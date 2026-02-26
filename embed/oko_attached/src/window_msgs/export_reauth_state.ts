import type { AuthType } from "@oko-wallet/oko-types/auth";

export interface ReAuthCredentials {
  idToken: string;
  userIdentifier: string;
  authType: AuthType;
}

let reAuthResolver: ((creds: ReAuthCredentials) => void) | null = null;
let reAuthRejecter: ((err: Error) => void) | null = null;

export function setReAuthResolver(): Promise<ReAuthCredentials> {
  if (reAuthRejecter) {
    reAuthRejecter(new Error("Superseded by new export request"));
  }
  reAuthResolver = null;
  reAuthRejecter = null;

  return new Promise<ReAuthCredentials>((resolve, reject) => {
    reAuthResolver = resolve;
    reAuthRejecter = reject;
  });
}

export function consumeReAuthResolver(creds: ReAuthCredentials): boolean {
  if (!reAuthResolver) {
    return false;
  }
  const resolver = reAuthResolver;
  reAuthResolver = null;
  reAuthRejecter = null;
  resolver(creds);
  return true;
}

export function rejectReAuthResolver(error: string): void {
  if (reAuthRejecter) {
    const rejecter = reAuthRejecter;
    reAuthResolver = null;
    reAuthRejecter = null;
    rejecter(new Error(error));
  }
}

export function hasActiveReAuthResolver(): boolean {
  return reAuthResolver !== null;
}
