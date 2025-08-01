use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PublicKeyResponse {
    pub public_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExchangeRequest {
    pub client_public_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExchangeResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EncryptedMessage {
    pub encrypted_data: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EncryptedResponse {
    pub decrypted_data: String,
    pub response_encrypted: String,
}