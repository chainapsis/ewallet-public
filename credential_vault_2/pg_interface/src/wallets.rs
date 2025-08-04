use crate::types::{CreateCredentialVaultWalletRequest, CredentialVaultWallet, Result};
use tokio_postgres::Client;
use uuid::Uuid;

pub async fn create_wallet(
    client: &Client,
    request: CreateCredentialVaultWalletRequest,
) -> Result<CredentialVaultWallet> {
    let wallet_id = Uuid::new_v4();
    let query = "
        INSERT INTO wallets (
            wallet_id, user_id, curve_type, public_key
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
    ";

    let row = client
        .query_one(
            query,
            &[
                &wallet_id,
                &request.user_id,
                &request.curve_type,
                &request.public_key,
            ],
        )
        .await?;

    Ok(CredentialVaultWallet {
        wallet_id: row.get("wallet_id"),
        user_id: row.get("user_id"),
        curve_type: row.get("curve_type"),
        public_key: row.get("public_key"),
        metadata: row.get("metadata"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub async fn get_wallet_by_id(
    client: &Client,
    wallet_id: Uuid,
) -> Result<Option<CredentialVaultWallet>> {
    let query = "SELECT * FROM wallets WHERE wallet_id = $1 LIMIT 1";
    let rows = client.query(query, &[&wallet_id]).await?;

    if let Some(row) = rows.first() {
        Ok(Some(CredentialVaultWallet {
            wallet_id: row.get("wallet_id"),
            user_id: row.get("user_id"),
            curve_type: row.get("curve_type"),
            public_key: row.get("public_key"),
            metadata: row.get("metadata"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn get_wallet_by_public_key(
    client: &Client,
    public_key: &[u8],
) -> Result<Option<CredentialVaultWallet>> {
    let query = "SELECT * FROM wallets WHERE public_key = $1 LIMIT 1";
    let rows = client.query(query, &[&public_key]).await?;

    if let Some(row) = rows.first() {
        Ok(Some(CredentialVaultWallet {
            wallet_id: row.get("wallet_id"),
            user_id: row.get("user_id"),
            curve_type: row.get("curve_type"),
            public_key: row.get("public_key"),
            metadata: row.get("metadata"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }))
    } else {
        Ok(None)
    }
}
