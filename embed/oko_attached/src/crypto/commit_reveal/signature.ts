import type {
  ApiName as OkoApiName,
  CommitRevealParams,
} from "@oko-wallet/oko-types/commit_reveal";
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
  const operationType = session.ksn_operation_types[nodeUrl];
  if (!nodePubkey) {
    return { success: false, err: `ks node pubkey not found for ${nodeUrl}` };
  }
  if (!operationType) {
    return {
      success: false,
      err: `ks operation type not found for ${nodeUrl}`,
    };
  }

  return createRevealSignature(
    session.client_keypair.privateKey,
    nodePubkey,
    session.session_id,
    session.auth_type,
    session.id_token,
    operationType,
    apiName,
  );
}

export function createOkoApiCommitRevealParams(
  session: ClientCommitRevealSession,
  apiName: OkoApiName,
): Result<CommitRevealParams, string> {
  const sigRes = createOkoApiSignature(session, apiName);
  if (!sigRes.success) {
    return { success: false, err: sigRes.err };
  }
  return {
    success: true,
    data: {
      cr_session_id: session.session_id,
      cr_signature: sigRes.data,
    },
  };
}

export function createKsnCommitRevealParams(
  session: ClientCommitRevealSession,
  nodeEndpoint: string,
  apiName: KsnApiName,
): Result<CommitRevealParams, string> {
  const ksnSigRes = createKsnSignature(session, nodeEndpoint, apiName);
  if (!ksnSigRes.success) {
    return { success: false, err: ksnSigRes.err };
  }
  return {
    success: true,
    data: {
      cr_session_id: session.session_id,
      cr_signature: ksnSigRes.data,
    },
  };
}
