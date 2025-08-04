use crate::types::{CreateCredentialVaultKeyShareRequest, CredentialVaultKeyShare, Result};
use tokio_postgres::Client;
use uuid::Uuid;

pub async fn create_key_share(
    client: &Client,
    key_share_data: CreateCredentialVaultKeyShareRequest,
) -> Result<CredentialVaultKeyShare> {
    let share_id = Uuid::new_v4();
    let query = "
        INSERT INTO key_shares (
            share_id, wallet_id, enc_share
        )
        VALUES ($1, $2, $3)
        RETURNING *
    ";

    let row = client
        .query_one(
            query,
            &[
                &share_id,
                &key_share_data.wallet_id,
                &key_share_data.enc_share,
            ],
        )
        .await?;

    Ok(CredentialVaultKeyShare {
        share_id: row.get("share_id"),
        wallet_id: row.get("wallet_id"),
        enc_share: row.get("enc_share"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub async fn get_key_share_by_share_id(
    client: &Client,
    share_id: Uuid,
) -> Result<Option<CredentialVaultKeyShare>> {
    let query = "SELECT * FROM key_shares WHERE share_id = $1 LIMIT 1";
    let rows = client.query(query, &[&share_id]).await?;

    if let Some(row) = rows.first() {
        Ok(Some(CredentialVaultKeyShare {
            share_id: row.get("share_id"),
            wallet_id: row.get("wallet_id"),
            enc_share: row.get("enc_share"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn get_key_share_by_wallet_id(
    client: &Client,
    wallet_id: Uuid,
) -> Result<Option<CredentialVaultKeyShare>> {
    let query = "SELECT * FROM key_shares WHERE wallet_id = $1 LIMIT 1";
    let rows = client.query(query, &[&wallet_id]).await?;

    if let Some(row) = rows.first() {
        Ok(Some(CredentialVaultKeyShare {
            share_id: row.get("share_id"),
            wallet_id: row.get("wallet_id"),
            enc_share: row.get("enc_share"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }))
    } else {
        Ok(None)
    }
}
