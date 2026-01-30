export interface CommitRevealSignMessageArgs {
  nodePubkeyHex: string;
  sessionId: string;
  authType: string;
  idToken: string;
  operationType: string;
  apiName: string;
}

/**
 * Create the message to be signed for commit-reveal signature verification.
 * message = node_pubkey + session_id + auth_type + id_token + operation_type + api_name
 */
export function buildRevealMessage({
  nodePubkeyHex,
  sessionId,
  authType,
  idToken,
  operationType,
  apiName,
}: CommitRevealSignMessageArgs): string {
  return (
    nodePubkeyHex + sessionId + authType + idToken + operationType + apiName
  );
}
