use crate::types::{
    Bytes32, Bytes33, CommitIdTokenRequest, Error, IdTokenStatus, Result, WitnessedIdToken,
};
use chrono::{DateTime, Utc};
use tokio_postgres::Client;

pub async fn commit_id_token(
    client: &Client,
    commit_request: CommitIdTokenRequest,
) -> Result<WitnessedIdToken> {
    let query = "
        INSERT INTO witnessed_id_tokens (user_id, user_session_public_key, id_token_hash, status) 
        VALUES ($1, $2, $3, 'commit') 
        RETURNING *
    ";

    let row = client
        .query_one(
            query,
            &[
                &commit_request.user_id,
                &commit_request.user_session_public_key.0.as_slice(),
                &commit_request.id_token_hash.0.as_slice(),
            ],
        )
        .await?;

    let id_token_hash_bytes: Vec<u8> = row.get("id_token_hash");
    let id_token_hash_array: [u8; 32] = id_token_hash_bytes
        .try_into()
        .map_err(|_| Error::Custom("Invalid id_token_hash length".to_string()))?;
    let id_token_hash = Bytes32(id_token_hash_array);

    let status_str: String = row.get("status");
    let status = match status_str.as_str() {
        "commit" => IdTokenStatus::Commit,
        "reveal" => IdTokenStatus::Reveal,
        _ => return Err(Error::Custom("Invalid status".to_string())),
    };

    Ok(WitnessedIdToken {
        witness_id: row.get("witness_id"),
        user_id: row.get("user_id"),
        id_token_hash,
        status,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub async fn reveal_id_token(client: &Client, id_token_hash: Bytes32) -> Result<WitnessedIdToken> {
    let query = "
        UPDATE witnessed_id_tokens 
        SET status = 'reveal', updated_at = NOW() 
        WHERE id_token_hash = $1 
        RETURNING *
    ";

    let row = client
        .query_one(query, &[&id_token_hash.0.as_slice()])
        .await
        .map_err(|_| Error::Custom("Id token not found or already revealed".to_string()))?;

    let id_token_hash_bytes: Vec<u8> = row.get("id_token_hash");
    let id_token_hash_array: [u8; 32] = id_token_hash_bytes
        .try_into()
        .map_err(|_| Error::Custom("Invalid id_token_hash length".to_string()))?;
    let id_token_hash = Bytes32(id_token_hash_array);

    let status_str: String = row.get("status");
    let status = match status_str.as_str() {
        "commit" => IdTokenStatus::Commit,
        "reveal" => IdTokenStatus::Reveal,
        _ => return Err(Error::Custom("Invalid status".to_string())),
    };

    Ok(WitnessedIdToken {
        witness_id: row.get("witness_id"),
        user_id: row.get("user_id"),
        id_token_hash,
        status,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub async fn get_committed_id_token_by_user_session_public_key_and_threshold(
    client: &Client,
    user_session_public_key: Bytes33,
    created_at_threshold: DateTime<Utc>,
) -> Result<WitnessedIdToken> {
    let query = "
        SELECT * FROM witnessed_id_tokens 
        WHERE user_session_public_key = $1 
        AND status = 'commit'
        AND created_at > $2
        ORDER BY created_at DESC
        LIMIT 1
    ";

    let row = client
        .query_one(
            query,
            &[&user_session_public_key.0.as_slice(), &created_at_threshold],
        )
        .await
        .map_err(|_| Error::Custom("Id token not found".to_string()))?;

    let id_token_hash_bytes: Vec<u8> = row.get("id_token_hash");
    let id_token_hash_array: [u8; 32] = id_token_hash_bytes
        .try_into()
        .map_err(|_| Error::Custom("Invalid id_token_hash length".to_string()))?;
    let id_token_hash = Bytes32(id_token_hash_array);

    let status_str: String = row.get("status");
    let status = match status_str.as_str() {
        "commit" => IdTokenStatus::Commit,
        "reveal" => IdTokenStatus::Reveal,
        _ => return Err(Error::Custom("Invalid status".to_string())),
    };

    Ok(WitnessedIdToken {
        witness_id: row.get("witness_id"),
        user_id: row.get("user_id"),
        id_token_hash,
        status,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}
