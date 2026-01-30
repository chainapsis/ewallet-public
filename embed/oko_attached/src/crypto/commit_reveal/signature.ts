import type { ApiName as OkoApiName } from "@oko-wallet/oko-types/commit_reveal";
import type { ApiName as KsnApiName } from "@oko-wallet/ksn-interface/commit_reveal";
import type { Result } from "@oko-wallet/stdlib-js";

import type { ClientCommitRevealSession } from "./types";
import { createRevealSignature } from "./utils";

export function createOkoApiSignature(
  session: ClientCommitRevealSession,
  apiName: OkoApiName,
): Result<string, string> {
  if (!session.oko_api_node_pubkey) {
    return { success: false, err: "oko_api node pubkey not set" };
  }
  return createRevealSignature(
    session.client_keypair.privateKey,
    session.oko_api_node_pubkey,
    session.session_id,
    session.auth_type,
    session.id_token,
    session.operation_type,
    apiName,
  );
}

export function createKsnSignature(
  session: ClientCommitRevealSession,
  nodeUrl: string,
  apiName: KsnApiName,
): Result<string, string> {
  const nodePubkey = session.ksn_node_pubkeys[nodeUrl];
  if (!nodePubkey) {
    return { success: false, err: `KSN node pubkey not found for ${nodeUrl}` };
  }
  return createRevealSignature(
    session.client_keypair.privateKey,
    nodePubkey,
    session.session_id,
    session.auth_type,
    session.id_token,
    session.operation_type,
    apiName,
  );
}
