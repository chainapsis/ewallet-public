use chrono::{DateTime, Utc};
use serde::de::{self, Visitor};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt;
use uuid::Uuid;

#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub struct Bytes32(pub [u8; 32]);

#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub struct Bytes33(pub [u8; 33]);

impl Serialize for Bytes32 {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_bytes(&self.0)
    }
}

struct Bytes32Visitor;

impl<'de> Visitor<'de> for Bytes32Visitor {
    type Value = Bytes32;

    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str("32 bytes")
    }

    fn visit_bytes<E>(self, value: &[u8]) -> std::result::Result<Self::Value, E>
    where
        E: de::Error,
    {
        if value.len() == 32 {
            let mut bytes = [0u8; 32];
            bytes.copy_from_slice(value);
            Ok(Bytes32(bytes))
        } else {
            Err(E::custom(format!("expected 32 bytes, got {}", value.len())))
        }
    }

    fn visit_seq<A>(self, mut seq: A) -> std::result::Result<Self::Value, A::Error>
    where
        A: de::SeqAccess<'de>,
    {
        let mut bytes = [0u8; 32];
        for (i, byte) in bytes.iter_mut().enumerate() {
            *byte = seq
                .next_element()?
                .ok_or_else(|| de::Error::invalid_length(i, &self))?;
        }
        Ok(Bytes32(bytes))
    }
}

impl<'de> Deserialize<'de> for Bytes32 {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_bytes(Bytes32Visitor)
    }
}

impl Serialize for Bytes33 {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_bytes(&self.0)
    }
}

struct Bytes33Visitor;

impl<'de> Visitor<'de> for Bytes33Visitor {
    type Value = Bytes33;

    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str("33 bytes")
    }

    fn visit_bytes<E>(self, value: &[u8]) -> std::result::Result<Self::Value, E>
    where
        E: de::Error,
    {
        if value.len() == 33 {
            let mut bytes = [0u8; 33];
            bytes.copy_from_slice(value);
            Ok(Bytes33(bytes))
        } else {
            Err(E::custom(format!("expected 33 bytes, got {}", value.len())))
        }
    }

    fn visit_seq<A>(self, mut seq: A) -> std::result::Result<Self::Value, A::Error>
    where
        A: de::SeqAccess<'de>,
    {
        let mut bytes = [0u8; 33];
        for (i, byte) in bytes.iter_mut().enumerate() {
            *byte = seq
                .next_element()?
                .ok_or_else(|| de::Error::invalid_length(i, &self))?;
        }
        Ok(Bytes33(bytes))
    }
}

impl<'de> Deserialize<'de> for Bytes33 {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_bytes(Bytes33Visitor)
    }
}

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Database error: {0}")]
    Database(#[from] tokio_postgres::Error),
    #[error("UUID error: {0}")]
    Uuid(#[from] uuid::Error),
    #[error("Custom error: {0}")]
    Custom(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CredentialVaultUser {
    pub user_id: Uuid,
    pub email: String,
    pub status: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CredentialVaultWallet {
    pub wallet_id: Uuid,
    pub user_id: Uuid,
    pub curve_type: Option<String>,
    pub public_key: Option<Vec<u8>>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCredentialVaultWalletRequest {
    pub user_id: Uuid,
    pub curve_type: String,
    pub public_key: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CredentialVaultKeyShare {
    pub share_id: Uuid,
    pub wallet_id: Uuid,
    pub enc_share: Vec<u8>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCredentialVaultKeyShareRequest {
    pub wallet_id: Uuid,
    pub enc_share: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum IdTokenStatus {
    #[serde(rename = "commit")]
    Commit,
    #[serde(rename = "reveal")]
    Reveal,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WitnessedIdToken {
    pub witness_id: Uuid,
    pub user_id: Uuid,
    pub id_token_hash: Bytes32,
    pub status: IdTokenStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommitIdTokenRequest {
    pub user_id: Uuid,
    pub user_session_public_key: Bytes33,
    pub id_token_hash: Bytes32,
}
