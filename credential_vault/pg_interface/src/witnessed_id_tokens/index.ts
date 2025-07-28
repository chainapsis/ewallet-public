import { Pool } from "pg";
import { Bytes, type Bytes32, type Bytes33 } from "@keplr-ewallet/bytes";
import type {
  CommitIdTokenRequest,
  IdTokenStatus,
  WitnessedIdToken,
} from "@keplr-ewallet/credential-vault-interface";
import type { Result } from "@keplr-ewallet/stdlib-js";

export async function commitIdToken(
  db: Pool,
  commitIdTokenRequest: CommitIdTokenRequest,
): Promise<Result<WitnessedIdToken, string>> {
  try {
    const query = `
    INSERT INTO witnessed_id_tokens (user_id, user_session_public_key, id_token_hash, status) 
    VALUES ($1, $2, $3, 'commit') 
    RETURNING *
    `;

    const values = [
      commitIdTokenRequest.user_id,
      commitIdTokenRequest.user_session_public_key.toUint8Array(),
      commitIdTokenRequest.id_token_hash.toUint8Array(),
    ];

    const result = await db.query(query, values);

    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Failed to commit id token" };
    }

    const idTokenHashResult = Bytes.fromUint8Array<32>(
      row.id_token_hash,
      row.id_token_hash.length,
    );
    if (!idTokenHashResult.success) {
      return { success: false, err: idTokenHashResult.err };
    }

    const witnessedIdToken: WitnessedIdToken = {
      witness_id: row.witness_id,
      user_id: row.user_id,
      id_token_hash: idTokenHashResult.data,
      status: row.status as IdTokenStatus,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return { success: true, data: witnessedIdToken };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function revealIdToken(
  db: Pool,
  id_token_hash: Bytes32,
): Promise<Result<WitnessedIdToken, string>> {
  try {
    const query = `
    UPDATE witnessed_id_tokens 
    SET status = 'reveal', updated_at = NOW() 
    WHERE id_token_hash = $1 
    RETURNING *
    `;

    const result = await db.query(query, [id_token_hash.toBuffer()]);

    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Id token not found or already revealed" };
    }

    const idTokenHashResult = Bytes.fromUint8Array<32>(
      row.id_token_hash,
      row.id_token_hash.length,
    );
    if (!idTokenHashResult.success) {
      return { success: false, err: idTokenHashResult.err };
    }

    const witnessedIdToken: WitnessedIdToken = {
      witness_id: row.witness_id,
      user_id: row.user_id,
      id_token_hash: idTokenHashResult.data,
      status: row.status as IdTokenStatus,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return { success: true, data: witnessedIdToken };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

// export async function getIdTokenBlacklistByHash(
//   db: Pool,
//   id_token_hash: Bytes32,
// ): Promise<Result<WitnessedIdToken | null, string>> {
//   try {
//     const query = `
//     SELECT * FROM witnessed_id_tokens
//     WHERE id_token_hash = $1
//     AND status = 'commit'
//     LIMIT 1
//     `;

//     const result = await db.query(query, [id_token_hash.toBuffer()]);

//     const row = result.rows[0];
//     if (!row) {
//       return { success: true, data: null };
//     }

//     const witnessedIdToken: WitnessedIdToken = {
//       witness_id: row.witness_id,
//       user_id: row.user_id,
//       id_token_hash: Bytes.fromUint8Array<32>(
//         row.id_token_hash,
//         row.id_token_hash.length,
//       ),
//       status: row.status as IdTokenStatus,
//       created_at: row.created_at,
//       updated_at: row.updated_at,
//     };

//     return { success: true, data: witnessedIdToken };
//   } catch (error) {
//     return { success: false, err: String(error) };
//   }
// }

export async function getCommittedIdTokenByUserSessionPublicKeyAndThreshold(
  db: Pool,
  user_session_public_key: Bytes33,
  created_at_threshold: Date,
): Promise<Result<WitnessedIdToken, string>> {
  try {
    const query = `
    SELECT * FROM witnessed_id_tokens 
    WHERE user_session_public_key = $1 
    AND status = 'commit'
    AND created_at > $2
    ORDER BY created_at DESC
    LIMIT 1
    `;

    const result = await db.query(query, [
      user_session_public_key.toUint8Array(),
      created_at_threshold,
    ]);

    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Id token not found" };
    }

    const idTokenHashResult = Bytes.fromUint8Array<32>(
      row.id_token_hash,
      row.id_token_hash.length,
    );
    if (!idTokenHashResult.success) {
      return { success: false, err: idTokenHashResult.err };
    }

    const witnessedIdToken: WitnessedIdToken = {
      witness_id: row.witness_id,
      user_id: row.user_id,
      id_token_hash: idTokenHashResult.data,
      status: row.status as IdTokenStatus,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return { success: true, data: witnessedIdToken };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}
